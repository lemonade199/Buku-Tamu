import pytest
from backend.app import create_app

@pytest.fixture
def client(tmp_path):
    test_db_file = tmp_path / "test_pass.db"
    test_db_url = f"sqlite:///{test_db_file}"

    app = create_app('development', db_url=test_db_url)
    app.config['TESTING'] = True
    app.config['JWT_SECRET_KEY'] = 'super-secret-test-key-32-chars-long'
    app.config['UPLOAD_FOLDER'] = str(tmp_path / "photos")

    with app.test_client() as client:
        yield client

def test_get_available_passes_public(client):
    res = client.get('/api/v1/pass/available')
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] is True
    assert isinstance(data['data'], list)
    assert len(data['data']) > 0

def test_create_pass_admin_only(client):
    login_petugas = client.post('/api/v1/auth/login', json={'username': 'petugas', 'password': 'Petugas123!'})
    petugas_token = login_petugas.get_json()['data']['access_token']

    fail_res = client.post('/api/v1/pass', json={'no_pass': '99', 'slot': 'Slot 99'}, headers={'Authorization': f'Bearer {petugas_token}'})
    assert fail_res.status_code == 403

    login_admin = client.post('/api/v1/auth/login', json={'username': 'admin', 'password': 'Admin123!'})
    admin_token = login_admin.get_json()['data']['access_token']

    success_res = client.post('/api/v1/pass', json={'no_pass': '99', 'slot': 'Slot 99'}, headers={'Authorization': f'Bearer {admin_token}'})
    assert success_res.status_code == 201
    assert success_res.get_json()['data']['no_pass'] == '99'

def test_update_pass_status(client):
    login_petugas = client.post('/api/v1/auth/login', json={'username': 'petugas', 'password': 'Petugas123!'})
    petugas_token = login_petugas.get_json()['data']['access_token']

    # Petugas cannot set card to MAINTENANCE (403 Forbidden)
    forbidden_res = client.put('/api/v1/pass/1/status', json={'status': 'MAINTENANCE', 'notes': 'Kartu retak'}, headers={'Authorization': f'Bearer {petugas_token}'})
    assert forbidden_res.status_code == 403

    login_admin = client.post('/api/v1/auth/login', json={'username': 'admin', 'password': 'Admin123!'})
    token = login_admin.get_json()['data']['access_token']

    res = client.put('/api/v1/pass/1/status', json={'status': 'MAINTENANCE', 'notes': 'Kartu retak'}, headers={'Authorization': f'Bearer {token}'})
    assert res.status_code == 200
    assert res.get_json()['data']['status'] == 'MAINTENANCE'

def test_change_pass_in_use_to_available_auto_checkouts_visitor(client):
    import io
    from PIL import Image
    import base64

    img = Image.new('RGB', (100, 100), color=(146, 0, 30))
    buf = io.BytesIO()
    img.save(buf, format='JPEG', quality=85)
    raw_b64 = base64.b64encode(buf.getvalue()).decode('utf-8')
    photo_b64 = f"data:image/jpeg;base64,{raw_b64}"

    checkin_res = client.post('/api/v1/visitors/checkin', json={
        'fullname': 'Tamu Uji Otomatis',
        'institution': 'PT Testing Otomatis',
        'representing': 'Quality Assurance',
        'purpose': 'Testing pass state transition',
        'id_pass': 2,
        'photo_base64': photo_b64
    })
    assert checkin_res.status_code == 201
    visitor_id = checkin_res.get_json()['data']['id_visitor']

    login_res = client.post('/api/v1/auth/login', json={'username': 'admin', 'password': 'Admin123!'})
    token = login_res.get_json()['data']['access_token']

    pass_res = client.get('/api/v1/pass', headers={'Authorization': f'Bearer {token}'})
    pass_2 = next(p for p in pass_res.get_json()['data'] if p['id_pass'] == 2)
    assert pass_2['status'] == 'PENDING'

    approve_res = client.post(f'/api/v1/visitors/{visitor_id}/approve', headers={'Authorization': f'Bearer {token}'})
    assert approve_res.status_code == 200

    pass_res = client.get('/api/v1/pass', headers={'Authorization': f'Bearer {token}'})
    pass_2 = next(p for p in pass_res.get_json()['data'] if p['id_pass'] == 2)
    assert pass_2['status'] == 'IN_USE'
    assert pass_2['current_holder']['id_visitor'] == visitor_id

    update_res = client.put('/api/v1/pass/2/status', json={
        'status': 'AVAILABLE',
        'notes': 'Pengembalian kartu langsung ke rak'
    }, headers={'Authorization': f'Bearer {token}'})
    assert update_res.status_code == 200
    update_data = update_res.get_json()
    assert update_data['success'] is True
    assert update_data['data']['status'] == 'AVAILABLE'
    assert 'otomatis' in update_data['message'].lower()

    visitor_detail = client.get(f'/api/v1/visitors/{visitor_id}', headers={'Authorization': f'Bearer {token}'})
    assert visitor_detail.status_code == 200
    assert visitor_detail.get_json()['data']['check_out_at'] is not None
