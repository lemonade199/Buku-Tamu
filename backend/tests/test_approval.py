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

def test_custom_role_rejection_and_pass_actions(client):
    from backend.app.models.base import get_db_session
    from backend.app.models.entities import Role, User
    from backend.app.utils.security import hash_password

    db = get_db_session()
    # Role with approval and pass management
    sec_role = Role(
        code='SECURITY_LEAD',
        name='Security Lead',
        description='Kepala keamanan dengan hak approve/reject',
        permissions=['visitors.read', 'visitors.approve', 'pass.read', 'pass.manage']
    )
    db.add(sec_role)
    db.commit()

    sec_user = User(
        fullname='Security Officer',
        username='seclead',
        email='seclead@example.com',
        hash_password=hash_password('Sec123!'),
        id_role=sec_role.id_role,
        is_active=True
    )
    db.add(sec_user)

    # Read-only role without approve/reject permissions
    view_role = Role(
        code='GUEST_VIEWER',
        name='Guest Viewer',
        description='Hanya bisa melihat data tamu',
        permissions=['visitors.read', 'pass.read']
    )
    db.add(view_role)
    db.commit()

    view_user = User(
        fullname='Viewer Only',
        username='viewer',
        email='viewer@example.com',
        hash_password=hash_password('View123!'),
        id_role=view_role.id_role,
        is_active=True
    )
    db.add(view_user)
    db.commit()
    db.close()

    # 1. Login as seclead
    login_sec = client.post('/api/v1/auth/login', json={'username': 'seclead', 'password': 'Sec123!'})
    assert login_sec.status_code == 200
    sec_token = login_sec.get_json()['data']['access_token']

    # 2. Login as viewer
    login_view = client.post('/api/v1/auth/login', json={'username': 'viewer', 'password': 'View123!'})
    assert login_view.status_code == 200
    view_token = login_view.get_json()['data']['access_token']

    # 3. Create visitor registration with pass 07
    reg1 = client.post('/api/v1/visitors/checkin', json={
        'fullname': 'Tamu Tolak Custom Role',
        'institution': 'PT Penguji Tolak',
        'no_pass': '07',
        'photo_base64': SAMPLE_PHOTO
    })
    assert reg1.status_code == 201
    vis1_id = reg1.get_json()['data']['id_visitor']

    # 4. Viewer cannot reject visitor (403 Forbidden)
    fail_reject = client.post(f'/api/v1/visitors/{vis1_id}/reject', json={'reason': 'Ditolak viewer'}, headers={'Authorization': f'Bearer {view_token}'})
    assert fail_reject.status_code == 403

    # 5. Seclead can reject visitor successfully (200 OK)
    sec_reject = client.post(f'/api/v1/visitors/{vis1_id}/reject', json={'reason': 'Alasan penolakan sah oleh Security Lead'}, headers={'Authorization': f'Bearer {sec_token}'})
    assert sec_reject.status_code == 200
    assert sec_reject.get_json()['data']['status'] == 'REJECTED'

    # 6. Create registration with pass 08, and test pass approval/rejection
    reg2 = client.post('/api/v1/visitors/checkin', json={
        'fullname': 'Tamu Pass Approve',
        'institution': 'PT Pass Approve',
        'no_pass': '08',
        'photo_base64': SAMPLE_PHOTO
    })
    assert reg2.status_code == 201

    # Viewer cannot approve pass (403)
    fail_pass_appr = client.post('/api/v1/pass/8/approve', headers={'Authorization': f'Bearer {view_token}'})
    assert fail_pass_appr.status_code == 403

    # Seclead can approve pass (200)
    sec_pass_appr = client.post('/api/v1/pass/8/approve', headers={'Authorization': f'Bearer {sec_token}'})
    assert sec_pass_appr.status_code == 200
    assert sec_pass_appr.get_json()['data']['status'] == 'IN_USE'

    # 7. Create registration with pass 09 and seclead rejects via pass route
    reg3 = client.post('/api/v1/visitors/checkin', json={
        'fullname': 'Tamu Pass Reject',
        'institution': 'PT Pass Reject',
        'no_pass': '09',
        'photo_base64': SAMPLE_PHOTO
    })
    assert reg3.status_code == 201

    sec_pass_rej = client.post('/api/v1/pass/9/reject', json={'reason': 'Kartu tidak sesuai standar'}, headers={'Authorization': f'Bearer {sec_token}'})
    assert sec_pass_rej.status_code == 200
    assert sec_pass_rej.get_json()['data']['status'] == 'AVAILABLE'


def test_custom_role_export_permission_enforcement(client):
    from backend.app.models.base import get_db_session
    from backend.app.models.entities import Role, User
    from backend.app.utils.security import hash_password

    db = get_db_session()
    analyst_role = Role(
        code='REPORT_ANALYST',
        name='Report Analyst',
        description='Bisa membaca laporan tapi tidak boleh ekspor',
        permissions=['reports.read', 'visitors.read']
    )
    db.add(analyst_role)
    db.commit()

    analyst_user = User(
        fullname='Data Analyst',
        username='analyst',
        email='analyst@example.com',
        hash_password=hash_password('Analyst123!'),
        id_role=analyst_role.id_role,
        is_active=True
    )
    db.add(analyst_user)
    db.commit()
    db.close()

    login_res = client.post('/api/v1/auth/login', json={'username': 'analyst', 'password': 'Analyst123!'})
    assert login_res.status_code == 200
    token = login_res.get_json()['data']['access_token']

    # Can read reports list (200 OK)
    list_res = client.get('/api/v1/visitors', headers={'Authorization': f'Bearer {token}'})
    assert list_res.status_code == 200

    # Cannot export excel (403 Forbidden)
    excel_res = client.get('/api/v1/visitors/export/excel', headers={'Authorization': f'Bearer {token}'})
    assert excel_res.status_code == 403

    # Cannot export pdf (403 Forbidden)
    pdf_res = client.get('/api/v1/visitors/export/pdf', headers={'Authorization': f'Bearer {token}'})
    assert pdf_res.status_code == 403


def test_timezone_wib_early_morning_and_date_boundaries(client):
    from datetime import datetime, timezone
    from backend.app.models.base import get_db_session
    from backend.app.models.entities import Visitor
    from backend.app.repositories.visitor_repository import VisitorRepository
    from backend.app.utils.datetime_utils import WIB_TZ

    db = get_db_session()
    now_wib = datetime.now(WIB_TZ)

    # Construct early morning 02:15 WIB timestamp for today
    wib_0215 = datetime(now_wib.year, now_wib.month, now_wib.day, 2, 15, tzinfo=WIB_TZ)
    # Converted to UTC naive: for WIB (UTC+7), 02:15 WIB is 19:15 UTC of yesterday!
    utc_early = wib_0215.astimezone(timezone.utc).replace(tzinfo=None)

    early_visitor = Visitor(
        id_pass=10,
        fullname='Tamu Subuh WIB',
        institution='PT Dini Hari',
        purpose='Audit dini hari WIB',
        status='APPROVED',
        check_in_at=utc_early,
        capture_id='test_capture_early.jpg'
    )
    db.add(early_visitor)
    db.commit()

    repo = VisitorRepository(db)
    # 1. VisitorRepository.count_today() must include this early morning visitor
    count_today = repo.count_today()
    assert count_today >= 1

    # 2. VisitorRepository.get_hourly_stats_today() must place it in the '02:00' WIB slot
    hourly = repo.get_hourly_stats_today()
    hour_02_entry = next((h for h in hourly if h['hour'] == '02:00'), None)
    assert hour_02_entry is not None
    assert hour_02_entry['count'] >= 1

    # 3. Weekly trend must record count on today's day of week
    weekly = repo.get_weekly_trend()
    assert len(weekly) == 7
    # The last element in weekly is today
    assert weekly[-1]['count'] >= 1

    db.close()

    # 4. Monitoring endpoint converts UTC to WIB date and time
    login_admin = client.post('/api/v1/auth/login', json={'username': 'admin', 'password': 'Admin123!'})
    token = login_admin.get_json()['data']['access_token']

    mon_res = client.get('/api/v1/pass/monitoring', headers={'Authorization': f'Bearer {token}'})
    assert mon_res.status_code == 200
    mon_records = mon_res.get_json()['data']
    early_rec = next((r for r in mon_records if r.get('guest_name') == 'Tamu Subuh WIB'), None)
    assert early_rec is not None
    assert early_rec['date'] == now_wib.strftime('%Y-%m-%d')
    assert early_rec['check_in_time'] == '02.15'


def test_report_date_filter_edge_cases(client):
    login_admin = client.post('/api/v1/auth/login', json={'username': 'admin', 'password': 'Admin123!'})
    token = login_admin.get_json()['data']['access_token']
    auth_headers = {'Authorization': f'Bearer {token}'}

    # 1. start_date > end_date must return 422 Unprocessable Entity
    invalid_range_res = client.get('/api/v1/visitors?start_date=2026-12-31&end_date=2026-01-01', headers=auth_headers)
    assert invalid_range_res.status_code == 422
    assert 'tidak bisa kurang dari' in invalid_range_res.get_json()['message']

    # 2. Invalid date format must not cause internal server error (500)
    malformed_date_res = client.get('/api/v1/visitors?start_date=abc&end_date=xyz', headers=auth_headers)
    assert malformed_date_res.status_code == 200
    assert malformed_date_res.get_json()['success'] is True

    # 3. Same start and end date (single day query) must succeed
    single_day_res = client.get('/api/v1/visitors?start_date=2026-11-24&end_date=2026-11-24', headers=auth_headers)
    assert single_day_res.status_code == 200
    assert single_day_res.get_json()['success'] is True

