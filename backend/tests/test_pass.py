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

def test_pending_pass_status_maintenance_cancels_visitor(client):
    import io
    from PIL import Image
    import base64

    img = Image.new('RGB', (100, 100), color=(100, 150, 200))
    buf = io.BytesIO()
    img.save(buf, format='JPEG', quality=85)
    raw_b64 = base64.b64encode(buf.getvalue()).decode('utf-8')
    photo_b64 = f"data:image/jpeg;base64,{raw_b64}"

    # Checkin with pass 3
    checkin_res = client.post('/api/v1/visitors/checkin', json={
        'fullname': 'Tamu Kartu Rusak',
        'institution': 'Instansi Pengujian',
        'representing': 'Audit',
        'purpose': 'Testing auto-reject on pass maintenance',
        'id_pass': 3,
        'photo_base64': photo_b64
    })
    assert checkin_res.status_code == 201
    visitor_id = checkin_res.get_json()['data']['id_visitor']

    login_admin = client.post('/api/v1/auth/login', json={'username': 'admin', 'password': 'Admin123!'})
    token = login_admin.get_json()['data']['access_token']

    # Pass 3 is PENDING
    pass_res = client.get('/api/v1/pass', headers={'Authorization': f'Bearer {token}'})
    pass_3 = next(p for p in pass_res.get_json()['data'] if p['id_pass'] == 3)
    assert pass_3['status'] == 'PENDING'

    # Admin marks pass 3 as MAINTENANCE (damaged/broken)
    update_res = client.put('/api/v1/pass/3/status', json={
        'status': 'MAINTENANCE',
        'notes': 'Kartu chip rusak tergores'
    }, headers={'Authorization': f'Bearer {token}'})
    assert update_res.status_code == 200
    assert update_res.get_json()['data']['status'] == 'MAINTENANCE'

    # Visitor must now be REJECTED with proper rejection reason
    vis_res = client.get(f'/api/v1/visitors/{visitor_id}', headers={'Authorization': f'Bearer {token}'})
    assert vis_res.status_code == 200
    vis_data = vis_res.get_json()['data']
    assert vis_data['status'] == 'REJECTED'
    assert 'Kartu chip rusak tergores' in vis_data['rejection_reason']

def test_pending_pass_status_inactive_cancels_visitor(client):
    import io
    from PIL import Image
    import base64

    img = Image.new('RGB', (100, 100), color=(80, 80, 80))
    buf = io.BytesIO()
    img.save(buf, format='JPEG', quality=85)
    raw_b64 = base64.b64encode(buf.getvalue()).decode('utf-8')
    photo_b64 = f"data:image/jpeg;base64,{raw_b64}"

    # Checkin with pass 4
    checkin_res = client.post('/api/v1/visitors/checkin', json={
        'fullname': 'Tamu Kartu Nonaktif',
        'institution': 'Instansi Uji 2',
        'representing': 'Audit 2',
        'purpose': 'Testing auto-reject on pass deactivation',
        'id_pass': 4,
        'photo_base64': photo_b64
    })
    assert checkin_res.status_code == 201
    visitor_id = checkin_res.get_json()['data']['id_visitor']

    login_admin = client.post('/api/v1/auth/login', json={'username': 'admin', 'password': 'Admin123!'})
    token = login_admin.get_json()['data']['access_token']

    # Admin marks pass 4 as INACTIVE
    update_res = client.put('/api/v1/pass/4/status', json={
        'status': 'INACTIVE'
    }, headers={'Authorization': f'Bearer {token}'})
    assert update_res.status_code == 200
    assert update_res.get_json()['data']['status'] == 'INACTIVE'

    # Visitor must now be REJECTED cleanly
    vis_res = client.get(f'/api/v1/visitors/{visitor_id}', headers={'Authorization': f'Bearer {token}'})
    assert vis_res.status_code == 200
    vis_data = vis_res.get_json()['data']
    assert vis_data['status'] == 'REJECTED'
    assert 'dinonaktifkan' in vis_data['rejection_reason'].lower()

def test_delete_pass_with_relation_validation(client):
    login_admin = client.post('/api/v1/auth/login', json={'username': 'admin', 'password': 'Admin123!'})
    token = login_admin.get_json()['data']['access_token']

    # 1. Create a brand new pass with no relations
    create_res = client.post('/api/v1/pass', json={'no_pass': '88', 'slot': 'Slot 88'}, headers={'Authorization': f'Bearer {token}'})
    assert create_res.status_code == 201
    pass_id = create_res.get_json()['data']['id_pass']

    # 2. Deleting an unused pass succeeds
    del_res = client.delete(f'/api/v1/pass/{pass_id}', headers={'Authorization': f'Bearer {token}'})
    assert del_res.status_code == 200
    assert del_res.get_json()['success'] is True

    # 3. Create another pass and attach a visitor
    create_res2 = client.post('/api/v1/pass', json={'no_pass': '89', 'slot': 'Slot 89'}, headers={'Authorization': f'Bearer {token}'})
    assert create_res2.status_code == 201
    pass_id_with_visitor = create_res2.get_json()['data']['id_pass']

    import io
    from PIL import Image
    import base64
    img = Image.new('RGB', (100, 100), color=(10, 20, 30))
    buf = io.BytesIO()
    img.save(buf, format='JPEG', quality=85)
    photo_b64 = f"data:image/jpeg;base64,{base64.b64encode(buf.getvalue()).decode('utf-8')}"

    checkin_res = client.post('/api/v1/visitors/checkin', json={
        'fullname': 'Tamu Terkait Pass 89',
        'institution': 'PT Relasi',
        'purpose': 'Testing pass relation validation on delete',
        'id_pass': pass_id_with_visitor,
        'photo_base64': photo_b64
    })
    assert checkin_res.status_code == 201

    # 4. Deleting pass with active/pending visitor fails (status 400)
    del_fail_res = client.delete(f'/api/v1/pass/{pass_id_with_visitor}', headers={'Authorization': f'Bearer {token}'})
    assert del_fail_res.status_code == 400
    assert 'tidak dapat dihapus' in del_fail_res.get_json()['message'].lower()

def test_update_visitor_endpoint(client):
    login_admin = client.post('/api/v1/auth/login', json={'username': 'admin', 'password': 'Admin123!'})
    token = login_admin.get_json()['data']['access_token']

    import io
    from PIL import Image
    import base64
    img = Image.new('RGB', (100, 100), color=(50, 60, 70))
    buf = io.BytesIO()
    img.save(buf, format='JPEG', quality=85)
    photo_b64 = f"data:image/jpeg;base64,{base64.b64encode(buf.getvalue()).decode('utf-8')}"

    # Checkin with pass 5
    checkin_res = client.post('/api/v1/visitors/checkin', json={
        'fullname': 'Tamu Awal',
        'institution': 'Instansi Lama',
        'purpose': 'Keperluan Lama',
        'id_pass': 5,
        'photo_base64': photo_b64
    })
    assert checkin_res.status_code == 201
    visitor_id = checkin_res.get_json()['data']['id_visitor']

    # Update visitor profile details
    update_res = client.put(f'/api/v1/visitors/{visitor_id}', json={
        'fullname': 'Tamu Revisi',
        'institution': 'Instansi Baru',
        'purpose': 'Keperluan Baru'
    }, headers={'Authorization': f'Bearer {token}'})
    assert update_res.status_code == 200
    updated_data = update_res.get_json()['data']
    assert updated_data['fullname'] == 'Tamu Revisi'
    assert updated_data['institution'] == 'Instansi Baru'
    assert updated_data['purpose'] == 'Keperluan Baru'

    # Reassign pass from 5 to 6 (pass 6 is AVAILABLE)
    reassign_res = client.put(f'/api/v1/visitors/{visitor_id}', json={
        'id_pass': 6
    }, headers={'Authorization': f'Bearer {token}'})
    assert reassign_res.status_code == 200
    assert reassign_res.get_json()['data']['id_pass'] == 6

    # Verify pass 5 returned to AVAILABLE and pass 6 is now PENDING
    pass_res = client.get('/api/v1/pass', headers={'Authorization': f'Bearer {token}'})
    passes_list = pass_res.get_json()['data']
    pass_5 = next(p for p in passes_list if p['id_pass'] == 5)
    pass_6 = next(p for p in passes_list if p['id_pass'] == 6)
    assert pass_5['status'] == 'AVAILABLE'
    assert pass_6['status'] == 'PENDING'

    # Approve visitor
    approve_res = client.post(f'/api/v1/visitors/{visitor_id}/approve', headers={'Authorization': f'Bearer {token}'})
    assert approve_res.status_code == 200

    # Attempting to reassign pass on APPROVED visitor must fail with 400
    fail_reassign = client.put(f'/api/v1/visitors/{visitor_id}', json={
        'id_pass': 7
    }, headers={'Authorization': f'Bearer {token}'})
    assert fail_reassign.status_code == 400
    assert 'PENDING' in fail_reassign.get_json()['message']


def test_edit_in_use_pass_in_master_auto_checkouts_visitor(client):
    import io
    import base64
    from PIL import Image

    img = Image.new('RGB', (100, 100), color=(20, 40, 60))
    buf = io.BytesIO()
    img.save(buf, format='JPEG', quality=85)
    photo_b64 = f"data:image/jpeg;base64,{base64.b64encode(buf.getvalue()).decode('utf-8')}"

    login_admin = client.post('/api/v1/auth/login', json={'username': 'admin', 'password': 'Admin123!'})
    token = login_admin.get_json()['data']['access_token']
    headers = {'Authorization': f'Bearer {token}'}

    # Checkin & approve using pass 7
    reg = client.post('/api/v1/visitors/checkin', json={
        'fullname': 'Tamu Edit Master Pass',
        'institution': 'PT Master',
        'id_pass': 7,
        'photo_base64': photo_b64
    })
    assert reg.status_code == 201
    vid = reg.get_json()['data']['id_visitor']
    assert client.post(f'/api/v1/visitors/{vid}/approve', headers=headers).status_code == 200

    # Deactivate pass 7 via PUT /api/v1/pass/7 (Master Data edit endpoint)
    edit_res = client.put('/api/v1/pass/7', json={
        'no_pass': '07',
        'slot': 'Slot 7',
        'kondisi': 'Baik',
        'is_active': False
    }, headers=headers)
    assert edit_res.status_code == 200
    edit_data = edit_res.get_json()
    assert edit_data['data']['status'] == 'INACTIVE'
    assert 'otomatis di-check-out' in edit_data['message'].lower()

    # Verify active visitor was checked out automatically
    detail = client.get(f'/api/v1/visitors/{vid}', headers=headers)
    assert detail.status_code == 200
    assert detail.get_json()['data']['check_out_at'] is not None
    assert detail.get_json()['data']['is_active'] is False
