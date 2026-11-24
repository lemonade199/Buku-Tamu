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
    test_db_file = tmp_path / "test_approval.db"
    test_db_url = f"sqlite:///{test_db_file}"

    app = create_app('development', db_url=test_db_url)
    app.config['TESTING'] = True
    app.config['JWT_SECRET_KEY'] = 'super-secret-test-key-32-chars-long'
    app.config['UPLOAD_FOLDER'] = str(tmp_path / "photos")

    with app.test_client() as client:
        yield client

def test_registration_creates_pending_status(client):
    reg_res = client.post('/api/v1/visitors/checkin', json={
        'fullname': 'Fajar Nugraha',
        'institution': 'SMK 1 Depok',
        'no_pass': '03',
        'photo_base64': SAMPLE_PHOTO
    })
    assert reg_res.status_code == 201
    reg_data = reg_res.get_json()['data']
    assert reg_data['status'] == 'PENDING'
    visitor_id = reg_data['id_visitor']

    avail_res = client.get('/api/v1/pass/available')
    avail_passes = [p['no_pass'] for p in avail_res.get_json()['data']]
    assert '03' not in avail_passes

    duplicate_res = client.post('/api/v1/visitors/checkin', json={
        'fullname': 'Tamu Lain',
        'no_pass': '03',
        'photo_base64': SAMPLE_PHOTO
    })
    assert duplicate_res.status_code == 400

    status_res = client.get(f'/api/v1/visitors/{visitor_id}/status')
    assert status_res.status_code == 200
    assert status_res.get_json()['data']['status'] == 'PENDING'

def test_receptionist_approval_workflow(client):
    reg_res = client.post('/api/v1/visitors/checkin', json={
        'fullname': 'Dewi Sartika',
        'institution': 'Dinas Pendidikan',
        'no_pass': '04',
        'photo_base64': SAMPLE_PHOTO
    })
    assert reg_res.status_code == 201
    visitor_id = reg_res.get_json()['data']['id_visitor']

    unauth_approve = client.post(f'/api/v1/visitors/{visitor_id}/approve')
    assert unauth_approve.status_code == 401

    login_res = client.post('/api/v1/auth/login', json={'username': 'rina', 'password': 'Rina123!'})
    token = login_res.get_json()['data']['access_token']

    pending_list = client.get('/api/v1/visitors/pending', headers={'Authorization': f'Bearer {token}'})
    assert pending_list.status_code == 200
    pending_ids = [v['id_visitor'] for v in pending_list.get_json()['data']]
    assert visitor_id in pending_ids

    approve_res = client.post(f'/api/v1/visitors/{visitor_id}/approve', headers={'Authorization': f'Bearer {token}'})
    assert approve_res.status_code == 200
    approve_data = approve_res.get_json()['data']
    assert approve_data['status'] == 'APPROVED'
    assert approve_data['pass_status'] == 'IN_USE'

    double_approve = client.post(f'/api/v1/visitors/{visitor_id}/approve', headers={'Authorization': f'Bearer {token}'})
    assert double_approve.status_code == 400

    double_reject = client.post(f'/api/v1/visitors/{visitor_id}/reject', json={'reason': 'Ditolak'}, headers={'Authorization': f'Bearer {token}'})
    assert double_reject.status_code == 400

    status_res = client.get(f'/api/v1/visitors/{visitor_id}/status')
    assert status_res.status_code == 200
    assert status_res.get_json()['data']['status'] == 'APPROVED'
    assert status_res.get_json()['data']['is_active'] is True

def test_receptionist_rejection_workflow(client):
    reg_res = client.post('/api/v1/visitors/checkin', json={
        'fullname': 'Doni Prasetyo',
        'institution': 'Vendor Luar',
        'no_pass': '05',
        'photo_base64': SAMPLE_PHOTO
    })
    assert reg_res.status_code == 201
    visitor_id = reg_res.get_json()['data']['id_visitor']

    login_res = client.post('/api/v1/auth/login', json={'username': 'petugas', 'password': 'Petugas123!'})
    token = login_res.get_json()['data']['access_token']

    reject_no_reason = client.post(f'/api/v1/visitors/{visitor_id}/reject', json={'reason': ''}, headers={'Authorization': f'Bearer {token}'})
    assert reject_no_reason.status_code in [400, 422]

    rejection_reason_text = "Pihak yang dituju sedang dinas luar kota hari ini."
    reject_res = client.post(f'/api/v1/visitors/{visitor_id}/reject', json={'reason': rejection_reason_text}, headers={'Authorization': f'Bearer {token}'})
    assert reject_res.status_code == 200
    reject_data = reject_res.get_json()['data']
    assert reject_data['status'] == 'REJECTED'
    assert reject_data['pass_status'] == 'AVAILABLE'
    assert reject_data['rejection_reason'] == rejection_reason_text

    avail_res = client.get('/api/v1/pass/available')
    avail_passes = [p['no_pass'] for p in avail_res.get_json()['data']]
    assert '05' in avail_passes

    status_res = client.get(f'/api/v1/visitors/{visitor_id}/status')
    assert status_res.status_code == 200
    assert status_res.get_json()['data']['status'] == 'REJECTED'
    assert status_res.get_json()['data']['rejection_reason'] == rejection_reason_text
    assert status_res.get_json()['data']['is_active'] is False

def test_custom_role_with_permissions_can_approve_and_export(client):
    from backend.app.models.base import get_db_session
    from backend.app.models.entities import Role, User
    from backend.app.utils.security import hash_password

    # 1. Create a custom role with permissions for approval and export
    db = get_db_session()
    sup_role = Role(
        code='SUPERVISOR',
        name='Supervisor Operasional',
        description='Pengawas operasional buku tamu',
        permissions=['dashboard.read', 'visitors.read', 'visitors.approve', 'reports.read', 'reports.export']
    )
    db.add(sup_role)
    db.commit()

    sup_user = User(
        fullname='Supervisor User',
        username='supervisor',
        email='supervisor@example.com',
        hash_password=hash_password('Super123!'),
        id_role=sup_role.id_role,
        is_active=True
    )
    db.add(sup_user)
    db.commit()
    db.close()

    # 2. Login as supervisor
    login_res = client.post('/api/v1/auth/login', json={'username': 'supervisor', 'password': 'Super123!'})
    assert login_res.status_code == 200
    token = login_res.get_json()['data']['access_token']

    # 3. Create a pending registration
    reg_res = client.post('/api/v1/visitors/checkin', json={
        'fullname': 'Tamu Custom Role',
        'institution': 'Instansi Penguji',
        'no_pass': '06',
        'photo_base64': SAMPLE_PHOTO
    })
    assert reg_res.status_code == 201
    visitor_id = reg_res.get_json()['data']['id_visitor']

    # 4. Supervisor can view pending registrations without 403
    pending_res = client.get('/api/v1/visitors/pending', headers={'Authorization': f'Bearer {token}'})
    assert pending_res.status_code == 200

    # 5. Supervisor can approve visitor registration without 403
    approve_res = client.post(f'/api/v1/visitors/{visitor_id}/approve', headers={'Authorization': f'Bearer {token}'})
    assert approve_res.status_code == 200
    assert approve_res.get_json()['data']['status'] == 'APPROVED'

    # 6. Supervisor can export excel and pdf without 403
    excel_res = client.get('/api/v1/visitors/export/excel', headers={'Authorization': f'Bearer {token}'})
    assert excel_res.status_code == 200

    pdf_res = client.get('/api/v1/visitors/export/pdf', headers={'Authorization': f'Bearer {token}'})
    assert pdf_res.status_code == 200

