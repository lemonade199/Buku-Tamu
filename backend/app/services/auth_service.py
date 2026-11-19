from datetime import datetime, timedelta
import json
from flask_jwt_extended import create_access_token, create_refresh_token
from backend.app.repositories.user_repository import UserRepository
from backend.app.utils.security import verify_password, hash_token, generate_random_token
from backend.app.utils.datetime_utils import utc_now

class AuthService:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    def authenticate_user(self, username: str, password: str) -> dict:
        user = self.user_repo.get_by_username_or_email(username)
        if not user or not user.is_active:
            raise ValueError("Username atau kata sandi tidak valid.")

        if not verify_password(password, user.hash_password):
            raise ValueError("Username atau kata sandi tidak valid.")

        # Update last login
        self.user_repo.update_last_login(user)

        # Parse permissions
        permissions = user.role.permissions if isinstance(user.role.permissions, list) else json.loads(user.role.permissions or '[]')

        identity = str(user.id_user)
        additional_claims = {
            'username': user.username,
            'fullname': user.fullname,
            'role': user.role.code,
            'permissions': permissions
        }

        access_token = create_access_token(identity=identity, additional_claims=additional_claims)
        
        # Refresh token custom random string
        raw_refresh_token = generate_random_token(48)
        token_hash = hash_token(raw_refresh_token)
        expires_at = utc_now() + timedelta(days=7)
        self.user_repo.save_refresh_token(user.id_user, token_hash, expires_at)

        return {
            'access_token': access_token,
            'refresh_token': raw_refresh_token,
            'token_type': 'Bearer',
            'expires_in': 900,
            'user': {
                'id_user': user.id_user,
                'fullname': user.fullname,
                'username': user.username,
                'email': user.email,
                'role_code': user.role.code,
                'role_name': user.role.name,
                'telephone': user.telephone,
                'permissions': permissions
            }
        }

    def refresh_access_token(self, raw_refresh_token: str) -> dict:
        token_hash = hash_token(raw_refresh_token)
        token_record = self.user_repo.get_active_refresh_token(token_hash)
        if not token_record:
            raise ValueError("Refresh token tidak valid atau sudah kadaluwarsa.")

        user = self.user_repo.get_by_id(token_record.id_user)
        if not user or not user.is_active:
            raise ValueError("Pengguna tidak aktif.")

        permissions = user.role.permissions if isinstance(user.role.permissions, list) else json.loads(user.role.permissions or '[]')

        identity = str(user.id_user)
        additional_claims = {
            'username': user.username,
            'fullname': user.fullname,
            'role': user.role.code,
            'permissions': permissions
        }

        new_access_token = create_access_token(identity=identity, additional_claims=additional_claims)
        return {
            'access_token': new_access_token,
            'token_type': 'Bearer',
            'expires_in': 900
        }

    def logout(self, raw_refresh_token: str):
        if raw_refresh_token:
            token_hash = hash_token(raw_refresh_token)
            self.user_repo.revoke_refresh_token(token_hash)
