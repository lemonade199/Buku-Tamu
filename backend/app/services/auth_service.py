from datetime import datetime, timedelta
import json
import urllib.request
import urllib.parse
import urllib.error
from flask_jwt_extended import create_access_token, create_refresh_token
from backend.app.repositories.user_repository import UserRepository
from backend.app.models.entities import Setting
from backend.app.utils.security import verify_password, hash_token, generate_random_token
from backend.app.utils.datetime_utils import utc_now


def verify_sso_token(token: str, issuer: str, client_id: str) -> str:
    """Verifikasi token SSO (id_token JWT atau OAuth2 access_token) ke server OIDC/Google.

    Tidak pernah mempercayai payload JWT yang hanya di-decode base64 tanpa verifikasi dari provider.
    Mengembalikan alamat email yang sudah terverifikasi, atau melempar ValueError jika tidak valid.
    """
    if not token or not isinstance(token, str):
        raise ValueError("Token autentikasi SSO tidak ditemukan.")
    if not client_id:
        raise ValueError("Client ID SSO belum dikonfigurasi oleh Administrator.")

    clean_issuer = (issuer or 'https://accounts.google.com').rstrip('/')
    is_google = 'accounts.google.com' in clean_issuer
    is_jwt = token.count('.') == 2

    if is_google:
        param_name = 'id_token' if is_jwt else 'access_token'
        url = f"https://oauth2.googleapis.com/tokeninfo?{param_name}={urllib.parse.quote(token, safe='')}"
        try:
            req = urllib.request.Request(url, headers={'Accept': 'application/json'})
            with urllib.request.urlopen(req, timeout=10) as resp:
                info = json.loads(resp.read().decode('utf-8'))
        except urllib.error.HTTPError:
            raise ValueError("Token SSO tidak valid atau sudah kadaluwarsa.")
        except Exception:
            raise ValueError("Gagal memverifikasi token SSO ke server Google.")

        aud = info.get('aud') or info.get('azp')
        if aud != client_id:
            raise ValueError("Token SSO tidak ditujukan untuk aplikasi ini (audience mismatch).")

        token_iss = (info.get('iss') or '').rstrip('/')
        if is_jwt and token_iss not in ('accounts.google.com', 'https://accounts.google.com'):
            raise ValueError("Issuer token SSO tidak valid.")

        email_verified = info.get('email_verified')
        if str(email_verified).lower() != 'true':
            raise ValueError("Email pada akun SSO belum terverifikasi.")

        email = (info.get('email') or '').strip()
        if not email:
            raise ValueError("Alamat email tidak ditemukan pada respons verifikasi SSO.")
        return email

    # Generic OIDC provider: verifikasi lewat userinfo_endpoint dari discovery document
    discovery_url = f"{clean_issuer}/.well-known/openid-configuration"
    try:
        with urllib.request.urlopen(urllib.request.Request(discovery_url, headers={'Accept': 'application/json'}), timeout=10) as resp:
            oidc_cfg = json.loads(resp.read().decode('utf-8'))
        userinfo_url = oidc_cfg.get('userinfo_endpoint')
        if not userinfo_url:
            raise ValueError("Endpoint userinfo OIDC tidak ditemukan.")
        req = urllib.request.Request(
            userinfo_url,
            headers={'Authorization': f'Bearer {token}', 'Accept': 'application/json'},
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            info = json.loads(resp.read().decode('utf-8'))
    except ValueError:
        raise
    except urllib.error.HTTPError:
        raise ValueError("Token SSO tidak valid atau ditolak oleh provider OIDC.")
    except Exception:
        raise ValueError("Gagal memverifikasi token SSO ke provider OIDC.")

    if info.get('email_verified') is False:
        raise ValueError("Email pada akun SSO belum terverifikasi.")

    email = (info.get('email') or '').strip()
    if not email:
        raise ValueError("Alamat email tidak ditemukan pada profil SSO.")
    return email

class AuthService:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    def _get_token_expiries(self) -> tuple[int, int]:
        """Returns (access_expiry_seconds, refresh_expiry_seconds) from Setting table or defaults."""
        try:
            setting = self.user_repo.db.query(Setting).first()
            if setting:
                access_sec = int(setting.jwt_access_token_expiry) if setting.jwt_access_token_expiry else 900
                refresh_sec = int(setting.jwt_refresh_token_expiry) if setting.jwt_refresh_token_expiry else 604800
                return access_sec, refresh_sec
        except Exception:
            pass
        return 900, 604800

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

        access_sec, refresh_sec = self._get_token_expiries()
        access_token = create_access_token(
            identity=identity,
            additional_claims=additional_claims,
            expires_delta=timedelta(seconds=access_sec)
        )
        
        # Refresh token custom random string
        raw_refresh_token = generate_random_token(48)
        token_hash = hash_token(raw_refresh_token)
        expires_at = utc_now() + timedelta(seconds=refresh_sec)
        self.user_repo.save_refresh_token(user.id_user, token_hash, expires_at)

        return {
            'access_token': access_token,
            'refresh_token': raw_refresh_token,
            'token_type': 'Bearer',
            'expires_in': access_sec,
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

        access_sec, _ = self._get_token_expiries()
        new_access_token = create_access_token(
            identity=identity,
            additional_claims=additional_claims,
            expires_delta=timedelta(seconds=access_sec)
        )
        return {
            'access_token': new_access_token,
            'token_type': 'Bearer',
            'expires_in': access_sec
        }

    def logout(self, raw_refresh_token: str) -> int | None:
        if raw_refresh_token:
            token_hash = hash_token(raw_refresh_token)
            token_record = self.user_repo.get_active_refresh_token(token_hash)
            uid = token_record.id_user if token_record else None
            self.user_repo.revoke_refresh_token(token_hash)
            return uid
        return None

    def authenticate_sso_user(self, email: str, fullname: str = None) -> dict:
        user = self.user_repo.get_by_username_or_email(email)
        if not user:
            raise ValueError(f"Akun SSO dengan email '{email}' belum terdaftar di sistem Buku Tamu. Silakan hubungi Administrator untuk pembuatan akun.")
        if not user.is_active:
            raise ValueError("Akun Anda telah dinonaktifkan oleh administrator. Silakan hubungi admin.")

        self.user_repo.update_last_login(user)

        permissions = user.role.permissions if isinstance(user.role.permissions, list) else json.loads(user.role.permissions or '[]')

        identity = str(user.id_user)
        additional_claims = {
            'username': user.username,
            'fullname': user.fullname,
            'role': user.role.code,
            'permissions': permissions
        }

        access_sec, refresh_sec = self._get_token_expiries()
        access_token = create_access_token(
            identity=identity,
            additional_claims=additional_claims,
            expires_delta=timedelta(seconds=access_sec)
        )

        raw_refresh_token = generate_random_token(48)
        token_hash = hash_token(raw_refresh_token)
        expires_at = utc_now() + timedelta(seconds=refresh_sec)
        self.user_repo.save_refresh_token(user.id_user, token_hash, expires_at)

        return {
            'access_token': access_token,
            'refresh_token': raw_refresh_token,
            'token_type': 'Bearer',
            'expires_in': access_sec,
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
