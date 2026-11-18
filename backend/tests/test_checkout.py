import pytest
import base64
import io
from PIL import Image
from backend.app import create_app

def get_test_photo_base64():
    img = Image.new('RGB', (100, 100), color=(146, 0, 30))
    buf = io.BytesIO()
    img.save(buf, format='JPEG', quality=85)
    raw_b64 = base64.b64encode(buf.getvalue()).decode('utf-8')
    return f"data:image/jpeg;base64,{raw_b64}"

SAMPLE_PHOTO = get_test_photo_base64()

@pytest.fixture
def client(tmp_path):
    test_db_file = tmp_path / "test_checkout.db"
    test_db_url = f"sqlite:///{test_db_file}"

    app = create_app('development', db_url=test_db_url)
    app.config['TESTING'] = True
    app.config['JWT_SECRET_KEY'] = 'super-secret-test-key-32-chars-long'
    app.config['UPLOAD_FOLDER'] = str(tmp_path / "photos")

    with app.test_client() as client:
        yield client

def test_checkout_by_id_success(client):
    login_res = client.post('/api/v1/auth/login', json={'username': 'petugas', 'password': 'Petugas123!'})
    token = login_res.get_json()['data']['access_token']

    checkin_res = client.post('/api/v1/visitors/checkin', json={
        'fullname': 'Siti Rahmawati',
        'telephone': '081233445566',
        'institution': 'Kemendikbud',
        'no_pass': '01',
        'photo_base64': SAMPLE_PHOTO
    })
    assert checkin_res.status_code == 201
    visitor_id = checkin_res.get_json()['data']['id_visitor']

    premature_checkout = client.post(f'/api/v1/visitors/{visitor_id}/checkout')
    assert premature_checkout.status_code == 400

    approve_res = client.post(f'/api/v1/visitors/{visitor_id}/approve', headers={'Authorization': f'Bearer {token}'})
    assert approve_res.status_code == 200

    checkout_res = client.post(f'/api/v1/visitors/{visitor_id}/checkout', json={
        'notes': 'Selesai konsultasi'
    })
    assert checkout_res.status_code == 200
    res_data = checkout_res.get_json()
    assert res_data['success'] is True
    assert res_data['data']['visitor']['check_out_at'] is not None
    assert res_data['data']['pass']['status'] == 'AVAILABLE'

    repeat_res = client.post(f'/api/v1/visitors/{visitor_id}/checkout')
    assert repeat_res.status_code == 400
    assert 'sudah check-out' in repeat_res.get_json()['message']

def test_checkout_by_pass_number(client):
    login_res = client.post('/api/v1/auth/login', json={'username': 'petugas', 'password': 'Petugas123!'})
    token = login_res.get_json()['data']['access_token']

    checkin_res = client.post('/api/v1/visitors/checkin', json={
        'fullname': 'Ahmad Fauzi',
        'telephone': '089988776655',
        'institution': 'Universitas Indonesia',
        'no_pass': '02',
        'photo_base64': SAMPLE_PHOTO
    })
    assert checkin_res.status_code == 201
    visitor_id = checkin_res.get_json()['data']['id_visitor']

    approve_res = client.post(f'/api/v1/visitors/{visitor_id}/approve', headers={'Authorization': f'Bearer {token}'})
    assert approve_res.status_code == 200

    checkout_res = client.post('/api/v1/visitors/checkout', json={
        'no_pass': '02'
    })
    assert checkout_res.status_code == 200
    res_data = checkout_res.get_json()
    assert res_data['success'] is True
    assert res_data['data']['pass']['no_pass'] == '02'
    assert res_data['data']['pass']['status'] == 'AVAILABLE'
    assert res_data['data']['visitor']['fullname'] == 'Ahmad Fauzi'
