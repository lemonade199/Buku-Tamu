import pytest
import io
import base64
from PIL import Image
from backend.app import create_app
from backend.app.models.base import init_db, Base, get_db_session
from backend.app.models.entities import Pass, Setting

def get_real_test_photo_base64():
    img = Image.new('RGB', (120, 120), color=(146, 0, 30))
    buf = io.BytesIO()
    img.save(buf, format='JPEG', quality=85)
    raw_b64 = base64.b64encode(buf.getvalue()).decode('utf-8')
    return f"data:image/jpeg;base64,{raw_b64}"

@pytest.fixture
def client(tmp_path):
    test_db_file = tmp_path / "test_p0.db"
    test_db_url = f"sqlite:///{test_db_file}"

    app = create_app('development', db_url=test_db_url)
    app.config['TESTING'] = True
    app.config['JWT_SECRET_KEY'] = 'super-secret-test-key-32-chars-long'
    app.config['UPLOAD_FOLDER'] = str(tmp_path / "photos")

    with app.test_client() as client:
        yield client

def test_logo_endpoint_blocks_visitor_and_avatar_bypass(client):
    # 1. Direct attempt to fetch visitor photo via public logo endpoint MUST return 403
    res_visitor = client.get('/api/v1/settings/logo/visitor_20261123_120000_abcd1234.jpg')
    assert res_visitor.status_code == 403
    assert 'Akses ditolak' in res_visitor.get_json()['message']

    # 2. Direct attempt to fetch staff avatar via public logo endpoint MUST return 403
    res_avatar = client.get('/api/v1/settings/logo/avatar_20261123_120000_abcd1234.jpg')
    assert res_avatar.status_code == 403
    assert 'Akses ditolak' in res_avatar.get_json()['message']

    # 3. Requesting a random unapproved file MUST return 403
    res_random = client.get('/api/v1/settings/logo/secret_data.txt')
    assert res_random.status_code == 403

def test_invalid_image_upload_rejected_on_checkin(client):
    login_res = client.post('/api/v1/auth/login', json={'username': 'petugas', 'password': 'Petugas123!'})
    token = login_res.get_json()['data']['access_token']

    # Create fake non-image binary payload (plain text masked as base64)
    fake_content = b"THIS IS NOT A VALID JPEG OR PNG IMAGE, JUST PLAIN TEXT EXECUTABLE CODE " * 15
    fake_b64 = "data:image/jpeg;base64," + base64.b64encode(fake_content).decode('utf-8')

    res = client.post('/api/v1/visitors/checkin', json={
        'fullname': 'Attacker Non-Image',
        'institution': 'Fake Institute',
        'no_pass': '01',
        'photo_base64': fake_b64
    }, headers={'Authorization': f'Bearer {token}'})

    # Must be rejected because Pillow validation catches it
    assert res.status_code in [400, 500]
    data = res.get_json()
    assert data['success'] is False
    assert any(w in data['message'].lower() for w in ['gambar', 'citra', 'korup', 'format', 'valid'])

def test_checkin_rate_limiting(client):
    # Enable test rate limiting
    client.application.config['TEST_RATE_LIMIT'] = True

    valid_photo = get_real_test_photo_base64()

    # The max is 15 per minute, so 16th request must trigger 429
    responses = []
    for i in range(16):
        res = client.post('/api/v1/visitors/checkin', json={
            'fullname': f'Tamu {i}',
            'institution': 'Testing Instansi',
            'no_pass': '01',
            'photo_base64': valid_photo
        })
        responses.append(res)

    last_response = responses[-1]
    assert last_response.status_code == 429
    assert last_response.get_json()['code'] == 'TOO_MANY_REQUESTS'
