import pytest
import base64
import io
from PIL import Image
from backend.app import create_app
from backend.app.models.base import init_db, Base, get_db_session
from backend.app.models.entities import Pass

def get_test_photo_base64():
    # Generate a real 100x100 RGB image and save as JPEG
    img = Image.new('RGB', (100, 100), color=(146, 0, 30))
    buf = io.BytesIO()
    img.save(buf, format='JPEG', quality=85)
    raw_b64 = base64.b64encode(buf.getvalue()).decode('utf-8')
    return f"data:image/jpeg;base64,{raw_b64}"

SAMPLE_PHOTO_BASE64 = get_test_photo_base64()

@pytest.fixture
def client(tmp_path):
    test_db_file = tmp_path / "test.db"
    test_db_url = f"sqlite:///{test_db_file}"

    app = create_app('development', db_url=test_db_url)
    app.config['TESTING'] = True
    app.config['JWT_SECRET_KEY'] = 'super-secret-test-key-32-chars-long'
    app.config['UPLOAD_FOLDER'] = str(tmp_path / "photos")

    with app.test_client() as client:
        yield client

def test_checkin_success(client):
    # Login as petugas
    login_res = client.post('/api/v1/auth/login', json={
        'username': 'petugas',
        'password': 'Petugas123!'
    })
    token = login_res.get_json()['data']['access_token']

    # Process checkin
    checkin_data = {
        'fullname': 'Budi Santoso',
        'telephone': '081298765432',
        'institution': 'PT Teknologi Bangsa',
        'representing': 'Divisi IT',
        'purpose': 'Rapat koordinasi teknis',
        'no_pass': '01',
        'photo_base64': SAMPLE_PHOTO_BASE64
    }

    res = client.post('/api/v1/visitors/checkin', json=checkin_data, headers={
        'Authorization': f'Bearer {token}'
    })
    assert res.status_code == 201
    data = res.get_json()
    assert data['success'] is True
    assert data['data']['fullname'] == 'Budi Santoso'
    assert data['data']['no_pass'] == '01'
    assert 'capture_id' in data['data']

def test_checkin_duplicate_pass_rejection(client):
    # Login as petugas
    login_res = client.post('/api/v1/auth/login', json={
        'username': 'petugas',
        'password': 'Petugas123!'
    })
    token = login_res.get_json()['data']['access_token']

    checkin_data = {
        'fullname': 'Tamu Pertama',
        'telephone': '081111111111',
        'no_pass': '02',
        'photo_base64': SAMPLE_PHOTO_BASE64
    }
    res1 = client.post('/api/v1/visitors/checkin', json=checkin_data, headers={
        'Authorization': f'Bearer {token}'
    })
    assert res1.status_code == 201

    # Second visitor attempts to use the SAME pass '02' while first is active
    checkin_data_2 = {
        'fullname': 'Tamu Kedua',
        'telephone': '082222222222',
        'no_pass': '02',
        'photo_base64': SAMPLE_PHOTO_BASE64
    }
    res2 = client.post('/api/v1/visitors/checkin', json=checkin_data_2, headers={
        'Authorization': f'Bearer {token}'
    })
    assert res2.status_code == 400
    assert 'sedang tidak tersedia' in res2.get_json()['message']

def test_checkin_requires_photo(client):
    login_res = client.post('/api/v1/auth/login', json={
        'username': 'petugas',
        'password': 'Petugas123!'
    })
    token = login_res.get_json()['data']['access_token']

    bad_data = {
        'fullname': 'Tamu Tanpa Foto',
        'telephone': '081233333333',
        'no_pass': '03',
        'photo_base64': ''
    }
    res = client.post('/api/v1/visitors/checkin', json=bad_data, headers={
        'Authorization': f'Bearer {token}'
    })
    assert res.status_code == 422
