from sqlalchemy.orm import Session
from backend.app.models.entities import Role, User, Pass, Setting
from backend.app.utils.security import hash_password

def seed_initial_data(db: Session):
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
            institution_name='Sistem Informasi Buku Tamu Digital',
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
    print("Initial seed data successfully checked/loaded.")
