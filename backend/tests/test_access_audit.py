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


def test_receptionist_names_visible_to_receptionist(client):
    login = client.post('/api/v1/auth/login', json={'username': 'petugas', 'password': 'Petugas123!'})
    token = login.get_json()['data']['access_token']

    res = client.get('/api/v1/auth/receptionists', headers={'Authorization': f'Bearer {token}'})
    assert res.status_code == 200, res.get_json()
    names = res.get_json()['data']
    assert isinstance(names, list) and len(names) > 0
    # Hanya nama yang dikirim, bukan data akun lengkap.
    assert all(isinstance(n, str) for n in names)


def test_user_list_hidden_from_receptionist(client):
    login = client.post('/api/v1/auth/login', json={'username': 'petugas', 'password': 'Petugas123!'})
    petugas = {'Authorization': f"Bearer {login.get_json()['data']['access_token']}"}

    # Resepsionis tidak boleh melihat email dan nomor HP semua akun.
    assert client.get('/api/v1/auth/users', headers=petugas).status_code == 403
    # Admin tetap bisa membuka Master Data.
    assert client.get('/api/v1/auth/users', headers=_admin_headers(client)).status_code == 200


def test_role_permissions_follow_matrix_on_fresh_install(client):
    from backend.app.models.entities import Role

    db = get_db_session()
    try:
        petugas = db.query(Role).filter(Role.code == 'PETUGAS').first()
        admin = db.query(Role).filter(Role.code == 'ADMIN').first()
        # Tabel bawaan: resepsionis boleh "Laporan & ekspor", admin tidak memegang penerimaan tamu.
        assert 'reports.export' in petugas.permissions
        assert 'visitors.create' not in admin.permissions
        assert 'settings.manage' in admin.permissions
    finally:
        db.close()

    login = client.post('/api/v1/auth/login', json={'username': 'petugas', 'password': 'Petugas123!'})
    headers = {'Authorization': f"Bearer {login.get_json()['data']['access_token']}"}
    assert client.get('/api/v1/visitors/export/excel', headers=headers).status_code == 200


def test_endpoints_enforce_permissions_and_admin_role(client):
    admin = _admin_headers(client)

    # Buat role kosong tanpa izin & akun dengan role tersebut
    r = client.post('/api/v1/auth/roles', json={'name': 'Operator Kosong', 'description': 'Tanpa izin'}, headers=admin)
    assert r.status_code == 201
    role_code = r.get_json()['data']['code']

    u = client.post('/api/v1/auth/users', json={
        'fullname': 'User Tanpa Izin',
        'username': 'operator_nol',
        'email': 'operator_nol@seamolec.org',
        'role_code': role_code,
        'password': 'User123!',
    }, headers=admin)
    assert u.status_code == 201

    login_op = client.post('/api/v1/auth/login', json={'username': 'operator_nol', 'password': 'User123!'})
    op_headers = {'Authorization': f"Bearer {login_op.get_json()['data']['access_token']}"}

    # Semua endpoint terproteksi harus menolak 403
    assert client.get('/api/v1/dashboard/metrics', headers=op_headers).status_code == 403
    assert client.get('/api/v1/visitors', headers=op_headers).status_code == 403
    assert client.get('/api/v1/visitors/active', headers=op_headers).status_code == 403
    assert client.get('/api/v1/visitors/1', headers=op_headers).status_code == 403
    assert client.get('/api/v1/visitors/1/photo', headers=op_headers).status_code == 403
    assert client.post('/api/v1/visitors/checkout', json={'no_pass': '01'}, headers=op_headers).status_code == 403
    assert client.post('/api/v1/visitors/1/checkout', headers=op_headers).status_code == 403
    assert client.put('/api/v1/pass/1/status', json={'status': 'AVAILABLE'}, headers=op_headers).status_code == 403
    assert client.post('/api/v1/settings/smtp/test', json={'smtp_host': 'smtp.example.com'}, headers=op_headers).status_code == 403

    # Petugas (Resepsionis) juga ditolak untuk test SMTP (khusus ADMIN)
    login_petugas = client.post('/api/v1/auth/login', json={'username': 'petugas', 'password': 'Petugas123!'})
    petugas_headers = {'Authorization': f"Bearer {login_petugas.get_json()['data']['access_token']}"}
    assert client.post('/api/v1/settings/smtp/test', json={'smtp_host': 'smtp.example.com'}, headers=petugas_headers).status_code == 403


def test_admin_respects_permission_matrix(client):
    admin = _admin_headers(client)

    # Secara bawaan di matriks, Admin tidak punya izin Penerimaan tamu & Pengembalian akses
    assert client.get('/api/v1/visitors/pending', headers=admin).status_code == 403
    assert client.post('/api/v1/visitors/checkout', json={'no_pass': '01'}, headers=admin).status_code == 403

    # Aktifkan Penerimaan tamu untuk Admin di matriks -> langsung diizinkan
    matrix = client.get('/api/v1/auth/roles/matrix', headers=admin).get_json()['data']
    for row in matrix:
        if row['id'] == 'checkin':
            row['admin'] = True
    assert client.put('/api/v1/auth/roles/matrix', json={'matrix': matrix}, headers=admin).status_code == 200
    assert client.get('/api/v1/visitors/pending', headers=admin).status_code == 200

