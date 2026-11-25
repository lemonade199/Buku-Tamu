import pytest
import os
from backend.app import create_app
from backend.app.models.base import init_db, Base

@pytest.fixture
def client():
    # Use in-memory SQLite database for testing
    test_db_url = "sqlite:///:memory:"
    engine, _ = init_db(test_db_url)
    Base.metadata.create_all(bind=engine)

    app = create_app('development')
    app.config['TESTING'] = True
    app.config['JWT_SECRET_KEY'] = 'test-secret-key-1234567890-min-32-chars'

    with app.test_client() as client:
        yield client

def test_health_check(client):
    res = client.get('/api/health')
    assert res.status_code == 200
    data = res.get_json()
    assert data['status'] == 'ok'

def test_login_success(client):
    res = client.post('/api/v1/auth/login', json={
        'username': 'admin',
        'password': 'Admin123!'
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] is True
    assert 'access_token' in data['data']
    assert 'refresh_token' in data['data']
    assert data['data']['user']['username'] == 'admin'
    assert data['data']['user']['role_code'] == 'ADMIN'

def test_login_invalid_password(client):
    res = client.post('/api/v1/auth/login', json={
        'username': 'admin',
        'password': 'WrongPassword!'
    })
    assert res.status_code == 401
    data = res.get_json()
    assert data['success'] is False

def test_refresh_token(client):
    # First login
    login_res = client.post('/api/v1/auth/login', json={
        'username': 'petugas',
        'password': 'Petugas123!'
    })
    assert login_res.status_code == 200
    refresh_token = login_res.get_json()['data']['refresh_token']

    # Refresh
    refresh_res = client.post('/api/v1/auth/refresh', json={
        'refresh_token': refresh_token
    })
    assert refresh_res.status_code == 200
    data = refresh_res.get_json()
    assert data['success'] is True
    assert 'access_token' in data['data']

def test_protected_dashboard_metrics(client):
    # Without token -> 401
    unauth_res = client.get('/api/v1/dashboard/metrics')
    assert unauth_res.status_code == 401

    # With valid token
    login_res = client.post('/api/v1/auth/login', json={
        'username': 'admin',
        'password': 'Admin123!'
    })
    access_token = login_res.get_json()['data']['access_token']

    auth_res = client.get('/api/v1/dashboard/metrics', headers={
        'Authorization': f'Bearer {access_token}'
    })
    assert auth_res.status_code == 200
    data = auth_res.get_json()
    assert data['success'] is True
    assert 'total_visitors_today' in data['data']
    assert 'available_pass' in data['data']

def test_login_rate_limiting(client):
    client.application.config['TEST_RATE_LIMIT'] = True
    try:
        # 5 failed login attempts
        for _ in range(5):
            res = client.post('/api/v1/auth/login', json={
                'username': 'admin',
                'password': 'WrongPassword123!'
            })
            assert res.status_code == 401

        # 6th attempt should be blocked with 429 Too Many Requests
        blocked_res = client.post('/api/v1/auth/login', json={
            'username': 'admin',
            'password': 'WrongPassword123!'
        })
        assert blocked_res.status_code == 429
        assert blocked_res.get_json()['code'] == 'TOO_MANY_REQUESTS'
    finally:
        client.application.config['TEST_RATE_LIMIT'] = False

def test_role_management_lifecycle(client):
    login_res = client.post('/api/v1/auth/login', json={'username': 'admin', 'password': 'Admin123!'})
    token = login_res.get_json()['data']['access_token']
    headers = {'Authorization': f'Bearer {token}'}

    # 1. List roles
    list_res = client.get('/api/v1/auth/roles', headers=headers)
    assert list_res.status_code == 200
    roles = list_res.get_json()['data']
    assert len(roles) >= 2

    # 2. Add new role
    create_res = client.post('/api/v1/auth/roles', json={
        'name': 'Petugas Keamanan',
        'description': 'Menjaga keamanan pos depan dan inspeksi kendaraan.'
    }, headers=headers)
    assert create_res.status_code == 201
    new_role = create_res.get_json()['data']
    role_id = new_role['id_role']
    assert new_role['name'] == 'Petugas Keamanan'

    # 3. Check matrix has new role column
    matrix_res = client.get('/api/v1/auth/roles/matrix', headers=headers)
    assert matrix_res.status_code == 200
    m_data = matrix_res.get_json()
    assert len(m_data['roles']) >= 3
    assert any(r['id_role'] == role_id for r in m_data['roles'])

    # 4. Update role
    update_res = client.put(f'/api/v1/auth/roles/{role_id}', json={
        'name': 'Chief Security',
        'description': 'Kepala pos keamanan.'
    }, headers=headers)
    assert update_res.status_code == 200
    assert update_res.get_json()['data']['name'] == 'Chief Security'

    # 5. Delete custom role
    del_res = client.delete(f'/api/v1/auth/roles/{role_id}', headers=headers)
    assert del_res.status_code == 200

