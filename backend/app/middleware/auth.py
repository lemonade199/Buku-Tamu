import json
from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt, get_jwt_identity

def role_required(*allowed_roles):
    """Decorator to enforce specific roles (e.g. @role_required('ADMIN'))."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            user_role = claims.get('role')
            if user_role not in allowed_roles:
                return jsonify({
                    'success': False,
                    'message': 'Akses ditolak: Anda tidak memiliki izin untuk fitur ini.'
                }), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def permission_required(*required_permissions):
    """Decorator to enforce granular permissions dynamically.
    Grants access if user is ADMIN, has wildcard '*', or has ANY of the required_permissions.
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            user_id = claims.get('sub')
            if not user_id:
                return jsonify({'success': False, 'message': 'Token tidak valid.'}), 401

            from backend.app.models.base import get_db_session
            from backend.app.models.entities import User
            db = get_db_session()
            try:
                user = db.query(User).filter(User.id_user == int(user_id)).first()
                if not user or not user.is_active or not user.role:
                    return jsonify({'success': False, 'message': 'Akses ditolak: Pengguna tidak valid atau nonaktif.'}), 403

                # Admin always has full access
                if user.role.code == 'ADMIN':
                    return fn(*args, **kwargs)

                perms = user.role.permissions if isinstance(user.role.permissions, list) else json.loads(user.role.permissions or '[]')
                has_perm = "*" in perms or any(p in perms for p in required_permissions)
                if not has_perm:
                    perm_str = ", ".join(required_permissions)
                    return jsonify({
                        'success': False,
                        'message': f'Akses ditolak: Anda tidak memiliki izin untuk fitur ini ({perm_str}).'
                    }), 403
            finally:
                db.close()

            return fn(*args, **kwargs)
        return wrapper
    return decorator
