import os
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from pydantic import ValidationError

from backend.app.models.base import get_db_session
from backend.app.models.entities import User, Role
from backend.app.repositories.user_repository import UserRepository
from backend.app.services.auth_service import AuthService
from backend.app.schemas.auth import LoginRequest, RefreshRequest
from backend.app.utils.security import verify_password, hash_password
from backend.app.utils.photo_storage import get_photo_path, save_user_avatar
from backend.app.middleware.auth import role_required

auth_bp = Blueprint('auth', __name__, url_prefix='/api/v1/auth')

@auth_bp.route('/login', methods=['POST'])
def login():
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
        return jsonify({
            'success': True,
            'message': 'Login berhasil.',
            'data': result
        }), 200
    except ValueError as e:
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
                'permissions': claims.get('permissions', [])
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
        db.commit()
        db.refresh(new_user)

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

        if role_code:
            role = db.query(Role).filter(Role.code == role_code.strip().upper()).first()
            if role:
                user.id_role = role.id_role

        if is_active is not None:
            user.is_active = bool(is_active)

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

        user.is_active = not user.is_active
        if not user.is_active:
            user_repo = UserRepository(db)
            user_repo.revoke_all_user_tokens(user.id_user)
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
