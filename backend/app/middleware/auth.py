from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt

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

def permission_required(required_permission):
    """Decorator to enforce specific granular permission."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            permissions = claims.get('permissions', [])
            if "*" not in permissions and required_permission not in permissions:
                return jsonify({
                    'success': False,
                    'message': f'Akses ditolak: Dibutuhkan izin {required_permission}.'
                }), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator
