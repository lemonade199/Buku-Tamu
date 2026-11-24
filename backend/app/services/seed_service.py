import os
from datetime import datetime, timedelta, time
from PIL import Image
from sqlalchemy.orm import Session
from backend.app.models.entities import Role, User, Pass, Setting, Visitor, AuditLog
from backend.app.utils.security import hash_password
from backend.app.utils.photo_storage import get_photo_path

def create_sample_photo(filename: str, color: tuple):
    full_path = get_photo_path(filename)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    if not os.path.exists(full_path):
        img = Image.new('RGB', (200, 200), color=color)
        img.save(full_path, format='JPEG', quality=85)

def seed_initial_data(db: Session, is_testing: bool = False):
    admin_role = db.query(Role).filter(Role.code == 'ADMIN').first()
    if not admin_role:
        admin_role = Role(
            code='ADMIN',
            name='Administrator',
            description='Mengelola seluruh fitur sistem.',
            permissions=["*"]
        )
        db.add(admin_role)

    petugas_role = db.query(Role).filter(Role.code == 'PETUGAS').first()
    if not petugas_role:
        petugas_role = Role(
            code='PETUGAS',
            name='Petugas',
            description='Mengelola operasional kunjungan dan penyerahan pass.',
            permissions=[
                "dashboard.read",
                "visitors.read",
                "visitors.create",
                "visitors.update",
                "visitors.checkin",
                "visitors.checkout",
                "pass.read",
                "pass.manage"
            ]
        )
        db.add(petugas_role)

    db.commit()

    admin_user = db.query(User).filter(User.username == 'admin').first()
    if not admin_user:
        admin_user = User(
            id_role=admin_role.id_role,
            fullname='Administrator Sistem',
            username='admin',
            email='admin@bukutamu.local',
            hash_password=hash_password('Admin123!'),
            telephone='081234567890',
            is_active=True
        )
        db.add(admin_user)

    petugas_user = db.query(User).filter(User.username == 'petugas').first()
    if not petugas_user:
        petugas_user = User(
            id_role=petugas_role.id_role,
            fullname='Petugas Resepsionis',
            username='petugas',
            email='petugas@bukutamu.local',
            hash_password=hash_password('Petugas123!'),
            telephone='089876543210',
            is_active=True
        )
        db.add(petugas_user)

    tasha_user = db.query(User).filter((User.username == 'tasha') | (User.username == 'tasha.admin') | (User.email == 'tasha@seamolec.org')).first()
    if not tasha_user:
        tasha_user = User(
            id_role=admin_role.id_role,
            fullname='Tasha Amelia',
            username='tasha.admin',
            email='tasha@seamolec.org',
            hash_password=hash_password('Tasha123!'),
            telephone='081211110000',
            last_login_at=datetime(2026, 11, 10, 7, 40),
            is_active=True
        )
        db.add(tasha_user)
    else:
        tasha_user.fullname = 'Tasha Amelia'
        tasha_user.username = 'tasha.admin'
        tasha_user.telephone = '081211110000'
        tasha_user.last_login_at = datetime(2026, 11, 10, 7, 40)
        tasha_user.is_active = True

    rina_user = db.query(User).filter((User.username == 'rina') | (User.username == 'rina.resepsionis') | (User.email == 'rina@seamolec.org')).first()
    if not rina_user:
        rina_user = User(
            id_role=petugas_role.id_role,
            fullname='Rina Wulandari',
            username='rina',
            email='rina@seamolec.org',
            hash_password=hash_password('Rina123!'),
            telephone='081298765432',
            last_login_at=datetime(2026, 11, 10, 7, 55),
            is_active=True
        )
        db.add(rina_user)
    else:
        rina_user.fullname = 'Rina Wulandari'
        rina_user.telephone = '081298765432'
        rina_user.last_login_at = datetime(2026, 11, 10, 7, 55)
        rina_user.is_active = True

    dimas_user = db.query(User).filter((User.username == 'dimas.resepsionis') | (User.email == 'dimas@seamolec.org')).first()
    if not dimas_user:
        dimas_user = User(
            id_role=petugas_role.id_role,
            fullname='Dimas Prakoso',
            username='dimas.resepsionis',
            email='dimas@seamolec.org',
            hash_password=hash_password('123456'),
            telephone='081377788899',
            last_login_at=datetime(2026, 11, 9, 7, 50),
            is_active=True
        )
        db.add(dimas_user)

    sari_user = db.query(User).filter((User.username == 'sari.resepsionis') | (User.email == 'sari@seamolec.org')).first()
    if not sari_user:
        sari_user = User(
            id_role=petugas_role.id_role,
            fullname='Sari Indah',
            username='sari.resepsionis',
            email='sari@seamolec.org',
            hash_password=hash_password('123456'),
            telephone='081355544433',
            last_login_at=datetime(2026, 10, 21, 8, 2),
            is_active=False
        )
        db.add(sari_user)

    setting = db.query(Setting).first()
    if not setting:
        setting = Setting(
            institution_name='SEAMOLEC',
            opening_time=time(7, 30),
            closing_time=time(16, 0),
            pass_warning_limit=5,
            smtp_host='email-smtp.ap-southeast-1.amazonaws.com',
            smtp_port=587,
            smtp_username='bukutamu-smpt',
            smtp_encryption='STARTTLS',
            smtp_sender_name='buku tamu SEAMOLEC',
            smtp_sender_email='buktam@seamolec.org',
            notify_app_checkin=True,
            notify_app_backup_fail=True,
            notify_email_monthly_report=True,
            notify_email_new_account=True,
            notify_email_reset_password=True,
            admin_notification_email='tasha@seamolec.org'
        )
        db.add(setting)
    else:
        if setting.institution_name in ['Nama Institusi', 'Sistem Informasi Buku Tamu Digital', 'SEAMEO SEAMOLEC']:
            setting.institution_name = 'SEAMOLEC'
        if not setting.opening_time:
            setting.opening_time = time(7, 30)
        if not setting.closing_time:
            setting.closing_time = time(16, 0)
        if not setting.smtp_host or setting.smtp_host == 'smtp.gmail.com':
            setting.smtp_host = 'email-smtp.ap-southeast-1.amazonaws.com'
        if not setting.smtp_port:
            setting.smtp_port = 587
        if not setting.smtp_username:
            setting.smtp_username = 'bukutamu-smpt'
        if not setting.smtp_encryption or setting.smtp_encryption == 'tls':
            setting.smtp_encryption = 'STARTTLS'
        if not setting.smtp_sender_name:
            setting.smtp_sender_name = 'buku tamu SEAMOLEC'
        if not setting.smtp_sender_email:
            setting.smtp_sender_email = 'buktam@seamolec.org'
        if not setting.admin_notification_email or setting.admin_notification_email == 'admin@seamolec.org':
            setting.admin_notification_email = 'tasha@seamolec.org'
        setting.notify_app_checkin = True
        setting.notify_app_backup_fail = True
        setting.notify_email_monthly_report = True
        setting.notify_email_new_account = True
        setting.notify_email_reset_password = True
        setting.jwt_access_token_expiry = 300
        setting.jwt_refresh_token_expiry = 604800
        setting.session_timeout_hours = 8
        setting.sso_enabled = True
        setting.sso_issuer = 'https://accounts.google.com'
        setting.sso_client_id = 'bukutamu-seamolec'

    existing_passes = db.query(Pass).count()
    if existing_passes == 0:
        for i in range(1, 21):
            no = f"{i:02d}"
            new_pass = Pass(
                no_pass=no,
                status='AVAILABLE',
                slot=f"Rak {chr(65 + (i - 1) // 10)} - {no}"
            )
            db.add(new_pass)
        db.commit()

    if not is_testing:
        existing_visitors = db.query(Visitor).count()
        if existing_visitors == 0:
            pass_01 = db.query(Pass).filter(Pass.no_pass == '01').first()
            pass_02 = db.query(Pass).filter(Pass.no_pass == '02').first()
            pass_03 = db.query(Pass).filter(Pass.no_pass == '03').first()
            pass_05 = db.query(Pass).filter(Pass.no_pass == '05').first()
            pass_07 = db.query(Pass).filter(Pass.no_pass == '07').first()

            now = datetime.now()

            photo1 = "visitor_seed_hendra.jpg"
            create_sample_photo(photo1, (43, 84, 126))
            v1 = Visitor(
                id_pass=pass_01.id_pass,
                fullname="Dr. Hendra Gunawan",
                institution="Pusdatin Kemendikbudristek",
                representing="Bapak Direktur",
                purpose="Koordinasi integrasi data pembelajaran digital nasional",
                check_in_at=now - timedelta(hours=2, minutes=15),
                check_out_at=None,
                capture_id=photo1
            )
            db.add(v1)
            if pass_01:
                pass_01.status = 'IN_USE'
                pass_01.handled_over_id = petugas_user.id_user if petugas_user else 2
                pass_01.handled_over_at = now - timedelta(hours=2, minutes=15)

            photo2 = "visitor_seed_dewi.jpg"
            create_sample_photo(photo2, (126, 43, 75))
            v2 = Visitor(
                id_pass=pass_03.id_pass,
                fullname="Dewi Lestari, M.Kom",
                institution="SEAMEO Secretariat Bangkok",
                representing="Divisi Diklat",
                purpose="Rapat teknis sinkronisasi kurikulum pelatihan vokasi",
                check_in_at=now - timedelta(hours=1, minutes=10),
                check_out_at=None,
                capture_id=photo2
            )
            db.add(v2)
            if pass_03:
                pass_03.status = 'IN_USE'
                pass_03.handled_over_id = petugas_user.id_user if petugas_user else 2
                pass_03.handled_over_at = now - timedelta(hours=1, minutes=10)

            photo3 = "visitor_seed_ahmad.jpg"
            create_sample_photo(photo3, (50, 115, 60))
            v3 = Visitor(
                id_pass=pass_02.id_pass,
                fullname="Ahmad Fauzi",
                institution="PT Telkom Indonesia",
                representing="Tim IT & Jaringan",
                purpose="Pengecekan rutin dan pemeliharaan server konektivitas",
                check_in_at=now - timedelta(hours=4, minutes=30),
                check_out_at=now - timedelta(hours=2, minutes=45),
                capture_id=photo3
            )
            db.add(v3)

            photo4 = "visitor_seed_rina.jpg"
            create_sample_photo(photo4, (140, 100, 30))
            v4 = Visitor(
                id_pass=pass_05.id_pass,
                fullname="Rina Kusuma, S.Pd",
                institution="Fakultas Ilmu Komputer UI",
                representing="Bagian Kerjasama",
                purpose="Penyerahan berkas Memorandum of Agreement (MoA)",
                check_in_at=now - timedelta(hours=5),
                check_out_at=now - timedelta(hours=3, minutes=15),
                capture_id=photo4
            )
            db.add(v4)

            photo5 = "visitor_seed_bambang.jpg"
            create_sample_photo(photo5, (90, 60, 130))
            v5 = Visitor(
                id_pass=pass_07.id_pass,
                fullname="Bambang Soeprapto",
                institution="Dinas Pendidikan DKI Jakarta",
                representing="Biro Humas & Protokol",
                purpose="Audiensi penjadwalan kunjungan studi tiru",
                check_in_at=now - timedelta(days=1, hours=3),
                check_out_at=now - timedelta(days=1, hours=1),
                capture_id=photo5
            )
            db.add(v5)

            # Tamu contoh dianggap sudah disetujui; tanpa ini mereka ikut default model PENDING.
            for seeded in (v1, v2, v3, v4, v5):
                seeded.status = 'APPROVED'
                seeded.approved_at = seeded.check_in_at
                seeded.approved_by_id = petugas_user.id_user if petugas_user else None

        # Perbaiki database yang sudah terlanjur berisi tamu contoh berstatus PENDING dari seed versi lama.
        stale_seed_visitors = db.query(Visitor).filter(
            Visitor.capture_id.like('visitor_seed_%'),
            Visitor.status == 'PENDING',
        ).all()
        for seeded in stale_seed_visitors:
            seeded.status = 'APPROVED'
            seeded.approved_at = seeded.approved_at or seeded.check_in_at

    db.commit()
    print("Initial seed data successfully checked/loaded.")
