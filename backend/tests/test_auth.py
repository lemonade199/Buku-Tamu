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
    app.config['JWT_SECRET_KEY'] = 'test-secret-key-12345'

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
