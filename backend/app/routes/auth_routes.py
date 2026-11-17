from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from pydantic import ValidationError

from backend.app.models.base import get_db_session
from backend.app.repositories.user_repository import UserRepository
from backend.app.services.auth_service import AuthService
from backend.app.schemas.auth import LoginRequest, RefreshRequest

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
