from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from pydantic import ValidationError

from backend.app.models.base import get_db_session
from backend.app.models.entities import User
from backend.app.repositories.user_repository import UserRepository
from backend.app.services.auth_service import AuthService
from backend.app.schemas.auth import LoginRequest, RefreshRequest
from backend.app.utils.security import verify_password, hash_password

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
