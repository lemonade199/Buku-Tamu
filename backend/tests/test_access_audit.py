import pytest
from backend.app import create_app
from backend.app.models.base import get_db_session
from backend.app.models.entities import User


@pytest.fixture
def client(tmp_path):
    app = create_app('development', db_url=f"sqlite:///{tmp_path / 'test.db'}")
    app.config['TESTING'] = True
    app.config['JWT_SECRET_KEY'] = 'super-secret-test-key-32-chars-long'
    with app.test_client() as client:
        yield client


def _admin_headers(client):
    res = client.post('/api/v1/auth/login', json={'username': 'admin', 'password': 'Admin123!'})
    return {'Authorization': f"Bearer {res.get_json()['data']['access_token']}"}


def _user(username):
    db = get_db_session()
    try:
        return db.query(User).filter(User.username == username).first()
    finally:
        db.close()


def _update_payload(user, **overrides):
    payload = {'fullname': user.fullname, 'username': user.username, 'email': user.email}
    payload.update(overrides)
    return payload


def test_admin_cannot_demote_own_account(client):
    headers = _admin_headers(client)
    me = _user('admin')
    res = client.put(f'/api/v1/auth/users/{me.id_user}', json=_update_payload(me, role_code='PETUGAS'), headers=headers)
    assert res.status_code == 400
    assert 'akun anda sendiri' in res.get_json()['message'].lower()


def test_admin_cannot_deactivate_own_account(client):
    headers = _admin_headers(client)
    me = _user('admin')
    res = client.patch(f'/api/v1/auth/users/{me.id_user}/toggle-active', headers=headers)
    assert res.status_code == 400
    assert _user('admin').is_active is True


def test_role_change_is_recorded_in_access_history(client):
    headers = _admin_headers(client)
    target = _user('petugas')
    res = client.put(f'/api/v1/auth/users/{target.id_user}', json=_update_payload(target, role_code='ADMIN'), headers=headers)
    assert res.status_code == 200, res.get_json()

    history = client.get('/api/v1/auth/audit/access', headers=headers).get_json()['data']
    entry = next(h for h in history if h['action'] == 'USER_ROLE_CHANGED')
    assert 'Resepsionis' in entry['description'] and 'Administrator' in entry['description']
    assert entry['actor']


def test_matrix_cannot_remove_admin_settings_access(client):
    headers = _admin_headers(client)
    matrix = client.get('/api/v1/auth/roles/matrix', headers=headers).get_json()['data']
    for row in matrix:
        if row['id'] == 'settings':
            row['admin'] = False
    res = client.put('/api/v1/auth/roles/matrix', json={'matrix': matrix}, headers=headers)
    assert res.status_code == 400


def test_matrix_change_is_recorded_with_before_and_after(client):
    headers = _admin_headers(client)
    matrix = client.get('/api/v1/auth/roles/matrix', headers=headers).get_json()['data']
    for row in matrix:
        if row['id'] == 'reports':
            row['receptionist'] = False
    res = client.put('/api/v1/auth/roles/matrix', json={'matrix': matrix}, headers=headers)
    assert res.status_code == 200

    history = client.get('/api/v1/auth/audit/access', headers=headers).get_json()['data']
    entry = next(h for h in history if h['action'] == 'PERMISSION_MATRIX_UPDATED')
    assert 'dicabut' in entry['description']


def test_access_history_requires_admin(client):
    res = client.post('/api/v1/auth/login', json={'username': 'petugas', 'password': 'Petugas123!'})
    headers = {'Authorization': f"Bearer {res.get_json()['data']['access_token']}"}
    assert client.get('/api/v1/auth/audit/access', headers=headers).status_code == 403
