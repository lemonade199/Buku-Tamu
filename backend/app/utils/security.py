import hashlib
import secrets
from werkzeug.security import generate_password_hash, check_password_hash

def hash_password(password: str) -> str:
    """Hash password using scrypt or pbkdf2 via werkzeug."""
    return generate_password_hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against hashed password."""
    return check_password_hash(hashed_password, plain_password)

def hash_token(raw_token: str) -> str:
    """Compute sha256 hash of refresh token for database storage."""
    return hashlib.sha256(raw_token.encode('utf-8')).hexdigest()

def generate_random_token(nbytes: int = 32) -> str:
    """Generate a cryptographically secure random token string."""
    return secrets.token_urlsafe(nbytes)
