import os
from datetime import timedelta
try:
    from dotenv import load_dotenv
    load_dotenv()
    load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))
    load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
except ImportError:
    pass

def _get_int_env(key: str, default: int) -> int:
    val = os.getenv(key)
    if val is None or not val.strip():
        return default
    try:
        return int(val.strip())
    except (ValueError, TypeError):
        return default

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'change-in-production-super-secret-key')
    
    # Database Configuration (PostgreSQL)
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = os.getenv('DB_PORT', '5432')
    DB_NAME = os.getenv('DB_NAME', 'buku_tamu')
    DB_USER = os.getenv('DB_USER', 'postgres')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '123')
    
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL',
        f'postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }

    # JWT Configuration
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(seconds=_get_int_env('JWT_ACCESS_TOKEN_EXPIRY', 900)) # 15 minutes
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(seconds=_get_int_env('JWT_REFRESH_TOKEN_EXPIRY', 604800)) # 7 days
    
    # Upload & Media Configuration
    BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    _upload_env = os.getenv('UPLOAD_FOLDER', 'storage/photos')
    if not os.path.isabs(_upload_env):
        UPLOAD_FOLDER = os.path.abspath(os.path.join(BASE_DIR, _upload_env))
    else:
        UPLOAD_FOLDER = os.path.abspath(_upload_env)
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max payload

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False

config_by_name = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
