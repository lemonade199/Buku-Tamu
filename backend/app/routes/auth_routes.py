import os
import re
import time
import json
from collections import defaultdict
from flask import Blueprint, request, jsonify, send_file, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from pydantic import ValidationError

from backend.app.models.base import get_db_session
from backend.app.models.entities import User, Role, Setting, AuditLog
from backend.app.repositories.user_repository import UserRepository
from backend.app.services.auth_service import AuthService
from backend.app.schemas.auth import LoginRequest, RefreshRequest
from backend.app.utils.security import verify_password, hash_password
from backend.app.utils.photo_storage import get_photo_path, save_user_avatar
from backend.app.middleware.auth import role_required, permission_required
from backend.app.services.email_service import send_new_account_email, send_password_reset_email

auth_bp = Blueprint('auth', __name__, url_prefix='/api/v1/auth')

_login_attempts = defaultdict(list)
_MAX_LOGIN_ATTEMPTS = 5
_LOGIN_LOCKOUT_SECONDS = 60

def _is_rate_limited(ip: str) -> bool:
    if current_app and current_app.config.get('TESTING') and not current_app.config.get('TEST_RATE_LIMIT'):
        return False
    now = time.time()
    _login_attempts[ip] = [ts for ts in _login_attempts[ip] if now - ts < _LOGIN_LOCKOUT_SECONDS]
    return len(_login_attempts[ip]) >= _MAX_LOGIN_ATTEMPTS

def _record_failed_attempt(ip: str):
    now = time.time()
    _login_attempts[ip].append(now)

def _clear_login_attempts(ip: str):
    _login_attempts.pop(ip, None)


# --- Riwayat perubahan hak akses dan proteksi akun admin ---

ACCESS_AUDIT_ACTIONS = [
    'USER_CREATED',
    'USER_ROLE_CHANGED',
    'USER_ACTIVATED',
    'USER_DEACTIVATED',
    'ROLE_CREATED',
    'ROLE_UPDATED',
    'ROLE_DELETED',
    'PERMISSION_MATRIX_UPDATED',
]


def _current_user_id():
    try:
        return int(get_jwt_identity())
    except Exception:
        return None


def _record_access_audit(db, action: str, entity: str, entity_id, description: str):
    """Mencatat siapa mengubah role/izin siapa, kapan, dan dari nilai apa ke apa."""
    db.add(AuditLog(
        id_user=_current_user_id(),
        action=action,
        entity=entity,
        entity_id=str(entity_id) if entity_id is not None else None,
        description=description,
        ip_address=request.remote_addr,
        user_agent=(request.headers.get('User-Agent') or '')[:500],
    ))


def _role_label(role) -> str:
    if not role:
        return '-'
    if role.code == 'PETUGAS' and role.name.lower() in ['petugas', 'resepsionis']:
        return 'Resepsionis'
    return role.name


def _other_active_admin_count(db, exclude_user_id: int) -> int:
    return db.query(User).join(Role, User.id_role == Role.id_role).filter(
        Role.code == 'ADMIN',
        User.is_active.is_(True),
        User.id_user != exclude_user_id,
    ).count()


def _admin_lockout_error(db, user, removing_admin_role: bool, deactivating: bool):
    """Mencegah admin mengunci aksesnya sendiri atau menghapus admin aktif terakhir."""
    current_id = _current_user_id()
    is_admin = bool(user.role and user.role.code == 'ADMIN')

    if current_id == user.id_user and deactivating:
        return 'Anda tidak dapat menonaktifkan akun Anda sendiri.'
    if current_id == user.id_user and removing_admin_role:
        return 'Anda tidak dapat menurunkan role akun Anda sendiri.'
    if is_admin and user.is_active and (removing_admin_role or deactivating):
        if _other_active_admin_count(db, user.id_user) == 0:
            return 'Minimal harus ada satu Administrator aktif. Tambahkan administrator lain terlebih dahulu.'
    return None

@auth_bp.route('/login', methods=['POST'])
def login():
    client_ip = request.remote_addr or 'unknown'
    if _is_rate_limited(client_ip):
        return jsonify({
            'success': False,
            'message': 'Terlalu banyak percobaan login yang gagal. Silakan coba kembali dalam 1 menit.',
            'code': 'TOO_MANY_REQUESTS'
        }), 429

    data = request.get_json() or {}
    try:
        req = LoginRequest(**data)
    except ValidationError as e:
        return jsonify({
            'success': False,
            'message': 'Validasi input gagal.',
            'errors': e.errors()
        }), 422

    db = get_db_session()
    try:
        user_repo = UserRepository(db)
        auth_service = AuthService(user_repo)
        result = auth_service.authenticate_user(req.username, req.password)
        _clear_login_attempts(client_ip)
        return jsonify({
            'success': True,
            'message': 'Login berhasil.',
            'data': result
        }), 200
    except ValueError as e:
        _record_failed_attempt(client_ip)
        return jsonify({
            'success': False,
            'message': str(e)
        }), 401
    finally:
        db.close()

@auth_bp.route('/refresh', methods=['POST'])
def refresh():
    data = request.get_json() or {}
    try:
        req = RefreshRequest(**data)
    except ValidationError as e:
        return jsonify({
            'success': False,
            'message': 'Validasi input gagal.',
            'errors': e.errors()
        }), 422

    db = get_db_session()
    try:
        user_repo = UserRepository(db)
        auth_service = AuthService(user_repo)
        result = auth_service.refresh_access_token(req.refresh_token)
        return jsonify({
            'success': True,
            'message': 'Token berhasil diperbarui.',
            'data': result
        }), 200
    except ValueError as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 401
    finally:
        db.close()

@auth_bp.route('/logout', methods=['POST'])
def logout():
    data = request.get_json() or {}
    refresh_token = data.get('refresh_token')
    if refresh_token:
        db = get_db_session()
        try:
            user_repo = UserRepository(db)
            auth_service = AuthService(user_repo)
            auth_service.logout(refresh_token)
        finally:
            db.close()

    return jsonify({
        'success': True,
        'message': 'Logout berhasil.'
    }), 200

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user_id = int(get_jwt_identity())
    claims = get_jwt()
    db = get_db_session()
    try:
        user_repo = UserRepository(db)
        user = user_repo.get_by_id(user_id)
        if not user or not user.is_active:
            return jsonify({
                'success': False,
                'message': 'Pengguna tidak ditemukan atau tidak aktif.'
            }), 404

        perms = user.role.permissions if isinstance(user.role.permissions, list) else json.loads(user.role.permissions or '[]')
        return jsonify({
            'success': True,
            'data': {
                'id_user': user.id_user,
                'fullname': user.fullname,
                'username': user.username,
                'email': user.email,
                'role_code': user.role.code,
                'role_name': user.role.name,
                'telephone': user.telephone,
                'permissions': perms
            }
        }), 200
    finally:
        db.close()

@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    fullname = (data.get('fullname') or '').strip()
    username = (data.get('username') or '').strip()
    email = (data.get('email') or '').strip()
    telephone = (data.get('telephone') or '').strip()

    if not fullname or not username or not email:
        return jsonify({
            'success': False,
            'message': 'Nama lengkap, username, dan email wajib diisi.'
        }), 400

    db = get_db_session()
    try:
        user_repo = UserRepository(db)
        user = user_repo.get_by_id(user_id)
        if not user or not user.is_active:
            return jsonify({
                'success': False,
                'message': 'Pengguna tidak ditemukan.'
            }), 404

        existing_user = db.query(User).filter(User.username == username, User.id_user != user_id).first()
        if existing_user:
            return jsonify({
                'success': False,
                'message': 'Username sudah digunakan oleh akun lain.'
            }), 409

        existing_email = db.query(User).filter(User.email == email, User.id_user != user_id).first()
        if existing_email:
            return jsonify({
                'success': False,
                'message': 'Email sudah digunakan oleh akun lain.'
            }), 409

        avatar_b64 = data.get('avatar')
        if avatar_b64:
            try:
                user.avatar = save_user_avatar(avatar_b64)
            except Exception:
                pass

        updated_user = user_repo.update_profile(user, fullname, email, telephone, username)
        return jsonify({
            'success': True,
            'message': 'Profil berhasil diperbarui.',
            'data': {
                'id_user': updated_user.id_user,
                'fullname': updated_user.fullname,
                'username': updated_user.username,
                'email': updated_user.email,
                'telephone': updated_user.telephone,
                'role_code': updated_user.role.code,
                'role_name': updated_user.role.name
            }
        }), 200
    finally:
        db.close()

@auth_bp.route('/password', methods=['PUT'])
@jwt_required()
def update_password():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    old_password = (data.get('old_password') or '').strip()
    new_password = (data.get('new_password') or '').strip()

    if not old_password or not new_password:
        return jsonify({
            'success': False,
            'message': 'Password lama dan password baru wajib diisi.'
        }), 400

    if len(new_password) < 6:
        return jsonify({
            'success': False,
            'message': 'Password baru minimal 6 karakter.'
        }), 400

    db = get_db_session()
    try:
        user_repo = UserRepository(db)
        user = user_repo.get_by_id(user_id)
        if not user or not user.is_active:
            return jsonify({
                'success': False,
                'message': 'Pengguna tidak ditemukan.'
            }), 404

        if not verify_password(old_password, user.hash_password):
            return jsonify({
                'success': False,
                'message': 'Password lama tidak sesuai.'
            }), 400

        new_hash = hash_password(new_password)
        user_repo.update_password(user, new_hash)
        return jsonify({
            'success': True,
            'message': 'Password berhasil diperbarui.'
        }), 200
    finally:
        db.close()

@auth_bp.route('/users', methods=['GET'])
@jwt_required()
def get_all_users():
    db = get_db_session()
    try:
        users = db.query(User).order_by(User.id_user.asc()).all()
        return jsonify({
            'success': True,
            'data': [u.to_dict() for u in users]
        }), 200
    finally:
        db.close()

@auth_bp.route('/receptionists', methods=['GET'])
@permission_required('reports.read')
def get_receptionist_names():
    """Nama resepsionis aktif untuk filter Laporan. Hanya nama, supaya resepsionis tidak melihat data akun lain."""
    db = get_db_session()
    try:
        names = [
            u.fullname
            for u in db.query(User).join(Role).filter(Role.code == 'PETUGAS', User.is_active.is_(True)).order_by(User.fullname.asc()).all()
        ]
        return jsonify({'success': True, 'data': names}), 200
    finally:
        db.close()

@auth_bp.route('/users', methods=['POST'])
@role_required('ADMIN')
def create_user():
    data = request.get_json() or {}
    fullname = (data.get('fullname') or '').strip()
    username = (data.get('username') or '').strip()
    email = (data.get('email') or '').strip()
    telephone = (data.get('telephone') or '').strip()
    role_code = (data.get('role_code') or 'PETUGAS').strip().upper()
    password = (data.get('password') or '123456').strip()

    if not fullname or not username or not email:
        return jsonify({
            'success': False,
            'message': 'Nama lengkap, username, dan email wajib diisi.'
        }), 400

    db = get_db_session()
    try:
        if db.query(User).filter(User.username == username).first():
            return jsonify({
                'success': False,
                'message': 'Username sudah digunakan.'
            }), 409

        if db.query(User).filter(User.email == email).first():
            return jsonify({
                'success': False,
                'message': 'Email sudah digunakan.'
            }), 409

        role = db.query(Role).filter(Role.code == role_code).first()
        if not role:
            role = db.query(Role).filter(Role.code == 'PETUGAS').first()

        avatar_b64 = data.get('avatar')
        avatar_filename = None
        if avatar_b64:
            try:
                avatar_filename = save_user_avatar(avatar_b64)
            except Exception:
                pass

        new_user = User(
            fullname=fullname,
            username=username,
            email=email,
            telephone=telephone or None,
            id_role=role.id_role if role else 2,
            hash_password=hash_password(password),
            avatar=avatar_filename,
            is_active=True
        )
        db.add(new_user)
        db.flush()
        _record_access_audit(
            db, 'USER_CREATED', 'user', new_user.id_user,
            f"Akun {new_user.fullname} (@{new_user.username}) dibuat dengan role {_role_label(role)}.",
        )
        db.commit()
        db.refresh(new_user)

        # Trigger new account email notification if enabled
        try:
            send_new_account_email(db, new_user, password)
        except Exception:
            pass

        return jsonify({
            'success': True,
            'message': 'Pengguna baru berhasil ditambahkan.',
            'data': new_user.to_dict()
        }), 201
    finally:
        db.close()

@auth_bp.route('/users/<int:user_id>', methods=['PUT'])
@role_required('ADMIN')
def update_user_by_admin(user_id: int):
    data = request.get_json() or {}
    fullname = (data.get('fullname') or '').strip()
    username = (data.get('username') or '').strip()
    email = (data.get('email') or '').strip()
    telephone = (data.get('telephone') or '').strip()
    role_code = data.get('role_code')
    is_active = data.get('is_active')

    if not fullname or not username or not email:
        return jsonify({
            'success': False,
            'message': 'Nama lengkap, username, dan email wajib diisi.'
        }), 400

    db = get_db_session()
    try:
        user = db.query(User).filter(User.id_user == user_id).first()
        if not user:
            return jsonify({
                'success': False,
                'message': 'Pengguna tidak ditemukan.'
            }), 404

        existing_username = db.query(User).filter(User.username == username, User.id_user != user_id).first()
        if existing_username:
            return jsonify({
                'success': False,
                'message': 'Username sudah digunakan oleh akun lain.'
            }), 409

        existing_email = db.query(User).filter(User.email == email, User.id_user != user_id).first()
        if existing_email:
            return jsonify({
                'success': False,
                'message': 'Email sudah digunakan oleh akun lain.'
            }), 409

        old_role = user.role
        new_role = None
        if role_code:
            new_role = db.query(Role).filter(Role.code == role_code.strip().upper()).first()
        role_changes = bool(new_role and old_role and new_role.id_role != old_role.id_role)
        deactivating = is_active is not None and not bool(is_active) and user.is_active

        lockout_error = _admin_lockout_error(
            db, user,
            removing_admin_role=role_changes and old_role.code == 'ADMIN',
            deactivating=deactivating,
        )
        if lockout_error:
            return jsonify({'success': False, 'message': lockout_error}), 400

        user.fullname = fullname
        user.username = username
        user.email = email
        user.telephone = telephone or None

        avatar_b64 = data.get('avatar')
        if avatar_b64:
            try:
                user.avatar = save_user_avatar(avatar_b64)
            except Exception:
                pass

        if role_changes:
            user.id_role = new_role.id_role
            _record_access_audit(
                db, 'USER_ROLE_CHANGED', 'user', user.id_user,
                f"Role {user.fullname} diubah dari {_role_label(old_role)} menjadi {_role_label(new_role)}.",
            )

        if is_active is not None and bool(is_active) != user.is_active:
            _record_access_audit(
                db, 'USER_ACTIVATED' if is_active else 'USER_DEACTIVATED', 'user', user.id_user,
                f"Akun {user.fullname} {'diaktifkan' if is_active else 'dinonaktifkan'}.",
            )

        if is_active is not None:
            user.is_active = bool(is_active)
            if not user.is_active:
                user_repo = UserRepository(db)
                user_repo.revoke_all_user_tokens(user.id_user)
            try:
                from backend.app import invalidate_user_active_cache
                invalidate_user_active_cache(user.id_user)
            except Exception:
                pass

        db.commit()
        db.refresh(user)

        return jsonify({
            'success': True,
            'message': 'Data pengguna berhasil diperbarui.',
            'data': user.to_dict()
        }), 200
    finally:
        db.close()

@auth_bp.route('/users/<int:user_id>/toggle-active', methods=['PATCH', 'PUT'])
@role_required('ADMIN')
def toggle_user_active(user_id: int):
    db = get_db_session()
    try:
        user = db.query(User).filter(User.id_user == user_id).first()
        if not user:
            return jsonify({
                'success': False,
                'message': 'Pengguna tidak ditemukan.'
            }), 404

        lockout_error = _admin_lockout_error(db, user, removing_admin_role=False, deactivating=user.is_active)
        if lockout_error:
            return jsonify({'success': False, 'message': lockout_error}), 400

        user.is_active = not user.is_active
        _record_access_audit(
            db, 'USER_ACTIVATED' if user.is_active else 'USER_DEACTIVATED', 'user', user.id_user,
            f"Akun {user.fullname} {'diaktifkan' if user.is_active else 'dinonaktifkan'}.",
        )
        if not user.is_active:
            user_repo = UserRepository(db)
            user_repo.revoke_all_user_tokens(user.id_user)
        try:
            from backend.app import invalidate_user_active_cache
            invalidate_user_active_cache(user.id_user)
        except Exception:
            pass
        db.commit()
        db.refresh(user)

        status_text = 'diaktifkan' if user.is_active else 'dinonaktifkan'
        return jsonify({
            'success': True,
            'message': f'Pengguna {user.fullname} berhasil {status_text}.',
            'data': user.to_dict()
        }), 200
    finally:
        db.close()

@auth_bp.route('/users/<int:user_id>/reset-password', methods=['POST'])
@role_required('ADMIN')
def reset_user_password(user_id: int):
    data = request.get_json() or {}
    new_password = (data.get('password') or '123456').strip()

    if len(new_password) < 6:
        return jsonify({
            'success': False,
            'message': 'Password minimal 6 karakter.'
        }), 400

    db = get_db_session()
    try:
        user = db.query(User).filter(User.id_user == user_id).first()
        if not user:
            return jsonify({
                'success': False,
                'message': 'Pengguna tidak ditemukan.'
            }), 404

        user.hash_password = hash_password(new_password)
        user_repo = UserRepository(db)
        user_repo.revoke_all_user_tokens(user.id_user)
        db.commit()

        # Trigger password reset email notification if enabled
        try:
            send_password_reset_email(db, user, new_password)
        except Exception:
            pass

        return jsonify({
            'success': True,
            'message': f'Password untuk {user.fullname} (@{user.username}) berhasil diatur ulang menjadi "{new_password}".',
            'data': {
                'id_user': user.id_user,
                'username': user.username,
                'new_password': new_password
            }
        }), 200
    finally:
        db.close()

@auth_bp.route('/users/<int:user_id>/avatar', methods=['GET'])
@jwt_required()
def get_user_avatar(user_id: int):
    db = get_db_session()
    try:
        user = db.query(User).filter(User.id_user == user_id).first()
        if not user or not user.avatar:
            return jsonify({
                'success': False,
                'message': 'Avatar tidak ditemukan.'
            }), 404

        photo_path = get_photo_path(user.avatar)
        if not os.path.exists(photo_path):
            return jsonify({
                'success': False,
                'message': 'File avatar tidak ditemukan di server.'
            }), 404

        return send_file(photo_path, mimetype='image/jpeg')
    finally:
        db.close()

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

@auth_bp.route('/roles', methods=['GET'])
@jwt_required()
def list_roles():
    db = get_db_session()
    try:
        roles = db.query(Role).order_by(Role.id_role.asc()).all()
        result = []
        for r in roles:
            data = r.to_dict()
            data['user_count'] = len(r.users)
            data['display_name'] = 'Resepsionis' if r.code == 'PETUGAS' and r.name.lower() in ['petugas', 'resepsionis'] else r.name
            data['role_key'] = 'admin' if r.code == 'ADMIN' else ('receptionist' if r.code == 'PETUGAS' else r.code.lower())
            result.append(data)
        return jsonify({'success': True, 'data': result}), 200
    finally:
        db.close()

@auth_bp.route('/roles', methods=['POST'])
@role_required('ADMIN')
def create_role():
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    description = (data.get('description') or '').strip()
    code = (data.get('code') or '').strip()

    if not name:
        return jsonify({'success': False, 'message': 'Nama role wajib diisi.'}), 400

    if not code:
        code = re.sub(r'[^A-Za-z0-9]', '_', name).upper()

    db = get_db_session()
    try:
        existing = db.query(Role).filter((Role.code == code) | (Role.name == name)).first()
        if existing:
            return jsonify({'success': False, 'message': f"Role dengan nama atau kode '{name}' sudah ada."}), 400

        new_role = Role(
            code=code,
            name=name,
            description=description,
            is_active=True,
            permissions=[]
        )
        db.add(new_role)
        db.flush()
        _record_access_audit(db, 'ROLE_CREATED', 'role', new_role.id_role, f"Role baru {name} dibuat.")

        setting = db.query(Setting).first()
        if setting and setting.permissions_matrix:
            matrix = list(setting.permissions_matrix)
            role_key = code.lower()
            for item in matrix:
                if role_key not in item:
                    item[role_key] = False
            setting.permissions_matrix = matrix

        db.commit()
        res_data = new_role.to_dict()
        res_data['user_count'] = 0
        res_data['display_name'] = new_role.name
        res_data['role_key'] = new_role.code.lower()
        return jsonify({
            'success': True,
            'message': f"Role '{name}' berhasil ditambahkan.",
            'data': res_data
        }), 201
    except Exception as e:
        db.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        db.close()

@auth_bp.route('/roles/<int:id_role>', methods=['PUT'])
@role_required('ADMIN')
def update_role(id_role: int):
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    description = (data.get('description') or '').strip()

    if not name:
        return jsonify({'success': False, 'message': 'Nama role wajib diisi.'}), 400

    db = get_db_session()
    try:
        role = db.query(Role).filter(Role.id_role == id_role).first()
        if not role:
            return jsonify({'success': False, 'message': 'Role tidak ditemukan.'}), 404

        changes = []
        if role.name != name:
            changes.append(f"nama dari {role.name} menjadi {name}")
        if (role.description or '') != description:
            changes.append("deskripsi diperbarui")
        role.name = name
        role.description = description
        if changes:
            _record_access_audit(db, 'ROLE_UPDATED', 'role', role.id_role, f"Role {name}: {', '.join(changes)}.")
        db.commit()

        res_data = role.to_dict()
        res_data['user_count'] = len(role.users)
        res_data['display_name'] = 'Resepsionis' if role.code == 'PETUGAS' and role.name.lower() in ['petugas', 'resepsionis'] else role.name
        res_data['role_key'] = 'admin' if role.code == 'ADMIN' else ('receptionist' if role.code == 'PETUGAS' else role.code.lower())
        return jsonify({
            'success': True,
            'message': f"Data role '{name}' berhasil diperbarui.",
            'data': res_data
        }), 200
    except Exception as e:
        db.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        db.close()

@auth_bp.route('/roles/<int:id_role>', methods=['DELETE'])
@role_required('ADMIN')
def delete_role(id_role: int):
    db = get_db_session()
    try:
        role = db.query(Role).filter(Role.id_role == id_role).first()
        if not role:
            return jsonify({'success': False, 'message': 'Role tidak ditemukan.'}), 404

        if role.code in ['ADMIN', 'PETUGAS']:
            return jsonify({'success': False, 'message': 'Role sistem utama tidak dapat dihapus.'}), 400

        if len(role.users) > 0:
            return jsonify({
                'success': False,
                'message': f"Role '{role.name}' tidak dapat dihapus karena masih digunakan oleh {len(role.users)} pengguna."
            }), 400

        role_key = role.code.lower()
        role_name = role.name
        _record_access_audit(db, 'ROLE_DELETED', 'role', role.id_role, f"Role {role_name} dihapus.")
        db.delete(role)

        setting = db.query(Setting).first()
        if setting and setting.permissions_matrix:
            matrix = list(setting.permissions_matrix)
            for item in matrix:
                item.pop(role_key, None)
            setting.permissions_matrix = matrix

        db.commit()
        return jsonify({
            'success': True,
            'message': f"Role '{role_name}' berhasil dihapus."
        }), 200
    except Exception as e:
        db.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        db.close()

@auth_bp.route('/roles/matrix', methods=['GET'])
@jwt_required()
def get_roles_matrix():
    db = get_db_session()
    try:
        roles = db.query(Role).order_by(Role.id_role.asc()).all()
        roles_meta = []
        for r in roles:
            roles_meta.append({
                'id_role': r.id_role,
                'code': r.code,
                'name': 'Resepsionis' if r.code == 'PETUGAS' and r.name.lower() in ['petugas', 'resepsionis'] else r.name,
                'key': 'admin' if r.code == 'ADMIN' else ('receptionist' if r.code == 'PETUGAS' else r.code.lower())
            })

        setting = db.query(Setting).first()
        matrix = list(setting.permissions_matrix) if setting and setting.permissions_matrix else list(DEFAULT_PERMISSIONS_MATRIX)

        # Make sure every role key is present in each matrix row
        for item in matrix:
            for rm in roles_meta:
                if rm['key'] not in item:
                    item[rm['key']] = False

        return jsonify({
            'success': True,
            'roles': roles_meta,
            'data': matrix
        }), 200
    finally:
        db.close()

@auth_bp.route('/roles/matrix', methods=['PUT'])
@role_required('ADMIN')
def update_roles_matrix():
    data = request.get_json() or {}
    new_matrix = data.get('matrix')
    if not isinstance(new_matrix, list):
        return jsonify({'success': False, 'message': 'Format data matriks tidak valid.'}), 400

    db = get_db_session()
    try:
        setting = db.query(Setting).first()
        if not setting:
            setting = Setting()
            db.add(setting)

        # Administrator harus tetap bisa membuka Pengaturan dan mengelola pengguna, supaya tidak terkunci.
        for item in new_matrix:
            if item.get('id') in ('settings', 'users') and not item.get('admin'):
                return jsonify({
                    'success': False,
                    'message': 'Administrator harus tetap memiliki akses "Pengguna & role" dan "Pengaturan sistem" agar tidak terkunci dari sistem.'
                }), 400

        old_matrix = list(setting.permissions_matrix) if setting.permissions_matrix else list(DEFAULT_PERMISSIONS_MATRIX)
        old_by_id = {row.get('id') or row.get('feature'): row for row in old_matrix}
        all_roles = db.query(Role).all()
        role_names = {
            ('admin' if r.code == 'ADMIN' else ('receptionist' if r.code == 'PETUGAS' else r.code.lower())): _role_label(r)
            for r in all_roles
        }
        matrix_changes = []
        for item in new_matrix:
            old_item = old_by_id.get(item.get('id') or item.get('feature'), {})
            for key, label in role_names.items():
                before, after = bool(old_item.get(key)), bool(item.get(key))
                if before != after:
                    matrix_changes.append(f"{item.get('feature', item.get('id'))} untuk {label}: {'diberikan' if after else 'dicabut'}")

        setting.permissions_matrix = new_matrix
        if matrix_changes:
            _record_access_audit(db, 'PERMISSION_MATRIX_UPDATED', 'permissions_matrix', None, '; '.join(matrix_changes) + '.')

        # Dynamically compute permissions for ALL roles in database
        for role in all_roles:
            role_key = 'admin' if role.code == 'ADMIN' else ('receptionist' if role.code == 'PETUGAS' else role.code.lower())
            role_perms = set()
            all_enabled = True

            for item in new_matrix:
                fid = item.get('id')
                if not fid:
                    fname = item.get('feature', '').lower()
                    for def_item in DEFAULT_PERMISSIONS_MATRIX:
                        if def_item['feature'].lower() in fname or fname in def_item['feature'].lower():
                            fid = def_item['id']
                            break

                perms = FEATURE_PERMS_MAP.get(fid, [item.get('perm')] if item.get('perm') else [])
                is_granted = bool(item.get(role_key))

                if is_granted:
                    role_perms.update(perms)
                else:
                    all_enabled = False

            if role.code == 'ADMIN' and all_enabled:
                role.permissions = ["*"]
            else:
                role.permissions = sorted(list(role_perms))

        db.commit()

        return jsonify({
            'success': True,
            'message': 'Matriks hak akses berhasil diperbarui.',
            'data': new_matrix
        }), 200
    except Exception as e:
        db.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        db.close()

@auth_bp.route('/audit/access', methods=['GET'])
@role_required('ADMIN')
def list_access_audit():
    """Riwayat perubahan pengguna, role, dan hak akses (terbaru di atas)."""
    try:
        limit = max(1, min(int(request.args.get('limit', 20)), 100))
    except ValueError:
        limit = 20
    db = get_db_session()
    try:
        logs = (
            db.query(AuditLog)
            .filter(AuditLog.action.in_(ACCESS_AUDIT_ACTIONS))
            .order_by(AuditLog.created_at.desc(), AuditLog.id_log.desc())
            .limit(limit)
            .all()
        )
        return jsonify({
            'success': True,
            'data': [{
                'id': log.id_log,
                'action': log.action,
                'description': log.description,
                'actor': log.user.fullname if log.user else 'Sistem',
                'created_at': log.created_at.isoformat() if log.created_at else None,
            } for log in logs],
        }), 200
    finally:
        db.close()

@auth_bp.route('/sso/config', methods=['GET'])
def get_sso_config():
    db = get_db_session()
    try:
        setting = db.query(Setting).first()
        return jsonify({
            'success': True,
            'data': {
                'enabled': bool(setting.sso_enabled) if setting else False,
                'issuer': setting.sso_issuer if setting and setting.sso_issuer else 'https://accounts.google.com',
                'client_id': setting.sso_client_id if setting else None
            }
        }), 200
    finally:
        db.close()

@auth_bp.route('/sso/callback', methods=['POST'])
def sso_callback():
    data = request.get_json(silent=True) or {}
    email = data.get('email')
    token = data.get('credential') or data.get('id_token')

    # If Google ID Token is provided, decode payload
    if not email and token:
        try:
            import base64
            parts = str(token).split('.')
            if len(parts) >= 2:
                payload_b64 = parts[1]
                payload_b64 += '=' * (-len(payload_b64) % 4)
                payload_json = json.loads(base64.urlsafe_b64decode(payload_b64).decode('utf-8'))
                email = payload_json.get('email')
        except Exception:
            pass

    if not email:
        return jsonify({
            'success': False,
            'message': 'Data autentikasi SSO tidak lengkap (alamat email tidak ditemukan).'
        }), 400

    db = get_db_session()
    try:
        setting = db.query(Setting).first()
        if setting and not setting.sso_enabled:
            return jsonify({
                'success': False,
                'message': 'Login SSO sedang dinonaktifkan oleh Administrator.'
            }), 403

        user_repo = UserRepository(db)
        auth_service = AuthService(user_repo)
        result = auth_service.authenticate_sso_user(email)
        return jsonify({
            'success': True,
            'message': 'Autentikasi SSO berhasil.',
            'data': result
        }), 200
    except ValueError as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f"Terjadi kesalahan saat memproses login SSO: {str(e)}"
        }), 500
    finally:
        db.close()

