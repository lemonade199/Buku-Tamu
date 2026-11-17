import os
from datetime import datetime, timedelta
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
    # 1. Seed Roles
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

    # 2. Seed Default Users
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

    # 3. Seed Default Setting
    setting = db.query(Setting).first()
    if not setting:
        setting = Setting(
            institution_name='SEAMEO SEAMOLEC',
            pass_warning_limit=5
        )
        db.add(setting)

    # 4. Seed Initial Passes (01 to 20)
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

    # 5. Seed Real Initial Visitors if empty (only for non-testing environments)
    if not is_testing:
        existing_visitors = db.query(Visitor).count()
        if existing_visitors == 0:
            pass_01 = db.query(Pass).filter(Pass.no_pass == '01').first()
            pass_02 = db.query(Pass).filter(Pass.no_pass == '02').first()
            pass_03 = db.query(Pass).filter(Pass.no_pass == '03').first()
            pass_05 = db.query(Pass).filter(Pass.no_pass == '05').first()
            pass_07 = db.query(Pass).filter(Pass.no_pass == '07').first()

            now = datetime.now()

            # Visitor 1 (Aktif di lokasi)
            photo1 = "visitor_seed_hendra.jpg"
            create_sample_photo(photo1, (43, 84, 126))
            v1 = Visitor(
                id_pass=pass_01.id_pass,
                fullname="Dr. Hendra Gunawan",
                telephone="081234567891",
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

            # Visitor 2 (Aktif di lokasi)
            photo2 = "visitor_seed_dewi.jpg"
            create_sample_photo(photo2, (126, 43, 75))
            v2 = Visitor(
                id_pass=pass_03.id_pass,
                fullname="Dewi Lestari, M.Kom",
                telephone="081987654321",
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

            # Visitor 3 (Sudah Checkout hari ini)
            photo3 = "visitor_seed_ahmad.jpg"
            create_sample_photo(photo3, (50, 115, 60))
            v3 = Visitor(
                id_pass=pass_02.id_pass,
                fullname="Ahmad Fauzi",
                telephone="085612345678",
                institution="PT Telkom Indonesia",
                representing="Tim IT & Jaringan",
                purpose="Pengecekan rutin dan pemeliharaan server konektivitas",
                check_in_at=now - timedelta(hours=4, minutes=30),
                check_out_at=now - timedelta(hours=2, minutes=45),
                capture_id=photo3
            )
            db.add(v3)

            # Visitor 4 (Sudah Checkout hari ini)
            photo4 = "visitor_seed_rina.jpg"
            create_sample_photo(photo4, (140, 100, 30))
            v4 = Visitor(
                id_pass=pass_05.id_pass,
                fullname="Rina Kusuma, S.Pd",
                telephone="087811223344",
                institution="Fakultas Ilmu Komputer UI",
                representing="Bagian Kerjasama",
                purpose="Penyerahan berkas Memorandum of Agreement (MoA)",
                check_in_at=now - timedelta(hours=5),
                check_out_at=now - timedelta(hours=3, minutes=15),
                capture_id=photo4
            )
            db.add(v4)

            # Visitor 5 (Kemarin)
            photo5 = "visitor_seed_bambang.jpg"
            create_sample_photo(photo5, (90, 60, 130))
            v5 = Visitor(
                id_pass=pass_07.id_pass,
                fullname="Bambang Soeprapto",
                telephone="082155667788",
                institution="Dinas Pendidikan DKI Jakarta",
                representing="Biro Humas & Protokol",
                purpose="Audiensi penjadwalan kunjungan studi tiru",
                check_in_at=now - timedelta(days=1, hours=3),
                check_out_at=now - timedelta(days=1, hours=1),
                capture_id=photo5
            )
            db.add(v5)

    db.commit()
    print("Initial seed data successfully checked/loaded.")
