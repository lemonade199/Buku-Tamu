"""Tabel hak akses per role (yang tampil di Pengaturan) dan penerapannya ke izin tiap role.

Izin role di database harus selalu sama dengan tabel ini. Kalau tidak, menu yang tampil
dan izin yang dicek backend bisa berbeda (misalnya tabel bilang boleh ekspor, backend menolak).
"""

DEFAULT_PERMISSIONS_MATRIX = [
    {"id": "dashboard", "feature": "Dashboard", "perm": "dashboard.read", "admin": True, "receptionist": True},
    {"id": "checkin", "feature": "Penerimaan tamu", "perm": "visitors.create", "admin": False, "receptionist": True},
    {"id": "pass_handover", "feature": "Serahkan kartu", "perm": "visitors.checkin", "admin": False, "receptionist": True},
    {"id": "checkout", "feature": "Pengembalian akses", "perm": "visitors.checkout", "admin": False, "receptionist": True},
    {"id": "pass_monitoring", "feature": "Monitoring kartu pass", "perm": "pass.read", "admin": True, "receptionist": True},
    {"id": "reports", "feature": "Laporan & ekspor", "perm": "reports.read", "admin": True, "receptionist": True},
    {"id": "master", "feature": "Master data (kartu pass & pengguna", "perm": "master.manage", "admin": True, "receptionist": False},
    {"id": "users", "feature": "Pengguna & role", "perm": "users.manage", "admin": True, "receptionist": False},
    {"id": "settings", "feature": "Pengaturan sistem", "perm": "settings.manage", "admin": True, "receptionist": False},
]

FEATURE_PERMS_MAP = {
    "dashboard": ["dashboard.read"],
    "checkin": ["visitors.read", "visitors.create"],
    "pass_handover": ["visitors.checkin", "visitors.approve"],
    "checkout": ["visitors.checkout"],
    "pass_monitoring": ["pass.read", "pass.manage"],
    "reports": ["reports.read", "reports.export"],
    "master": ["master.manage"],
    "users": ["users.manage"],
    "settings": ["settings.manage"],
}


def role_matrix_key(role) -> str:
    """Nama kolom role di tabel hak akses."""
    if role.code == 'ADMIN':
        return 'admin'
    if role.code == 'PETUGAS':
        return 'receptionist'
    return role.code.lower()


def permissions_for_role(role, matrix) -> list:
    """Hitung daftar izin role dari tabel hak akses. Admin dengan semua fitur dicentang mendapat '*'."""
    key = role_matrix_key(role)
    perms = set()
    all_enabled = True
    for item in matrix:
        fid = item.get('id')
        if not fid:
            fname = item.get('feature', '').lower()
            for def_item in DEFAULT_PERMISSIONS_MATRIX:
                if def_item['feature'].lower() in fname or fname in def_item['feature'].lower():
                    fid = def_item['id']
                    break
        feature_perms = FEATURE_PERMS_MAP.get(fid, [item.get('perm')] if item.get('perm') else [])
        if item.get(key):
            perms.update(feature_perms)
        else:
            all_enabled = False
    if role.code == 'ADMIN' and all_enabled:
        return ["*"]
    return sorted(perms)


def apply_matrix_to_roles(roles, matrix) -> None:
    for role in roles:
        role.permissions = permissions_for_role(role, matrix)
