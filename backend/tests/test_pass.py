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
