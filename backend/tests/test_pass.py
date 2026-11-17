import pytest
from backend.app import create_app

@pytest.fixture
def client(tmp_path):
    test_db_file = tmp_path / "test_pass.db"
    test_db_url = f"sqlite:///{test_db_file}"

    app = create_app('development', db_url=test_db_url)
    app.config['TESTING'] = True
    app.config['JWT_SECRET_KEY'] = 'super-secret-test-key-32-chars-long'

    with app.test_client() as client:
        yield client

def test_get_available_passes(client):
    login_res = client.post('/api/v1/auth/login', json={'username': 'petugas', 'password': 'Petugas123!'})
    token = login_res.get_json()['data']['access_token']

    res = client.get('/api/v1/pass/available', headers={'Authorization': f'Bearer {token}'})
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] is True
    assert len(data['data']) >= 20

def test_create_pass_admin_only(client):
    # Petugas should get 403 Forbidden
    petugas_res = client.post('/api/v1/auth/login', json={'username': 'petugas', 'password': 'Petugas123!'})
    petugas_token = petugas_res.get_json()['data']['access_token']

    res_petugas = client.post('/api/v1/pass', json={'no_pass': '99', 'slot': 'Rak C - 99'}, headers={
        'Authorization': f'Bearer {petugas_token}'
    })
    assert res_petugas.status_code == 403

    # Admin should succeed
    admin_res = client.post('/api/v1/auth/login', json={'username': 'admin', 'password': 'Admin123!'})
    admin_token = admin_res.get_json()['data']['access_token']

    res_admin = client.post('/api/v1/pass', json={'no_pass': '99', 'slot': 'Rak C - 99'}, headers={
        'Authorization': f'Bearer {admin_token}'
    })
    assert res_admin.status_code == 201
    assert res_admin.get_json()['data']['no_pass'] == '99'

def test_update_pass_status(client):
    login_res = client.post('/api/v1/auth/login', json={'username': 'admin', 'password': 'Admin123!'})
    token = login_res.get_json()['data']['access_token']

    res = client.put('/api/v1/pass/1/status', json={'status': 'MAINTENANCE', 'notes': 'Kartu tergores'}, headers={
        'Authorization': f'Bearer {token}'
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] is True
    assert data['data']['status'] == 'MAINTENANCE'

def test_change_pass_in_use_to_available_auto_checkouts_visitor(client):
    import io
    from PIL import Image
    import base64

    # Generate test image
    img = Image.new('RGB', (100, 100), color=(146, 0, 30))
    buf = io.BytesIO()
    img.save(buf, format='JPEG', quality=85)
    raw_b64 = base64.b64encode(buf.getvalue()).decode('utf-8')
    photo_b64 = f"data:image/jpeg;base64,{raw_b64}"

    # Check in a visitor with pass 02
    checkin_res = client.post('/api/v1/visitors/checkin', json={
        'fullname': 'Tamu Uji Otomatis',
        'telephone': '081234567890',
        'institution': 'PT Testing Otomatis',
        'representing': 'Quality Assurance',
        'purpose': 'Testing pass state transition',
        'id_pass': 2,
        'photo_base64': photo_b64
    })
    assert checkin_res.status_code == 201
    visitor_id = checkin_res.get_json()['data']['id_visitor']

    # Login as admin
    login_res = client.post('/api/v1/auth/login', json={'username': 'admin', 'password': 'Admin123!'})
    token = login_res.get_json()['data']['access_token']

    # Verify pass 2 is IN_USE
    pass_res = client.get('/api/v1/pass', headers={'Authorization': f'Bearer {token}'})
    pass_2 = next(p for p in pass_res.get_json()['data'] if p['id_pass'] == 2)
    assert pass_2['status'] == 'IN_USE'
    assert pass_2['current_holder']['id_visitor'] == visitor_id

    # Now change pass 2 status to AVAILABLE
    update_res = client.put('/api/v1/pass/2/status', json={
        'status': 'AVAILABLE',
        'notes': 'Pengembalian kartu langsung ke rak'
    }, headers={'Authorization': f'Bearer {token}'})
    assert update_res.status_code == 200
    update_data = update_res.get_json()
    assert update_data['success'] is True
    assert update_data['data']['status'] == 'AVAILABLE'
    assert 'otomatis' in update_data['message'].lower()

    # Verify the visitor is now checked out (check_out_at is not None)
    visitor_detail = client.get(f'/api/v1/visitors/{visitor_id}', headers={'Authorization': f'Bearer {token}'})
    assert visitor_detail.status_code == 200
    assert visitor_detail.get_json()['data']['check_out_at'] is not None
