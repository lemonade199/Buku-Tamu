import os
import time
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from backend.config import config_by_name
from backend.app.models.base import Base, init_db, get_db_session
from backend.app.services.seed_service import seed_initial_data
from backend.app.routes.auth_routes import auth_bp
from backend.app.routes.dashboard_routes import dashboard_bp
from backend.app.routes.visitor_routes import visitor_bp
from backend.app.routes.pass_routes import pass_bp
from backend.app.routes.setting_routes import setting_bp

jwt = JWTManager()

_user_active_cache = {}

def invalidate_user_active_cache(user_id=None):
    global _user_active_cache
    if user_id is None:
        _user_active_cache.clear()
    else:
        _user_active_cache.pop(user_id, None)

def create_app(config_name=None, db_url=None):
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')

    app = Flask(__name__)
    app.config.from_object(config_by_name.get(config_name, config_by_name['default']))

    # Initialize extensions with explicit origin whitelist compliant with W3C CORS spec
    cors_origins_env = os.getenv('CORS_ALLOWED_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5000')
    cors_origins = [o.strip() for o in cors_origins_env.split(',') if o.strip()]
    CORS(app, resources={r"/api/*": {"origins": cors_origins}}, supports_credentials=True)
    jwt.init_app(app)

    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        identity = jwt_payload.get('sub')
        if not identity:
            return True
        try:
            user_id = int(identity)
        except (ValueError, TypeError):
            return True

        now_ts = time.time()
        cached = _user_active_cache.get(user_id)
        if cached and (now_ts - cached[1] < 15):
            return not cached[0]

        from backend.app.models.entities import User
        db = get_db_session()
        try:
            user = db.query(User).filter(User.id_user == user_id).first()
            is_active = bool(user and user.is_active)
            _user_active_cache[user_id] = (is_active, now_ts)
            return not is_active
        finally:
            db.close()

    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return jsonify({
            'success': False,
            'message': 'Akun Anda telah dinonaktifkan oleh administrator. Silakan hubungi admin.',
            'code': 'USER_INACTIVE'
        }), 401

    engine, _ = init_db(db_url)
    Base.metadata.create_all(bind=engine)

    if not engine.url.drivername.startswith('sqlite'):
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("""
                ALTER TABLE visitors ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'APPROVED';
                ALTER TABLE visitors ADD COLUMN IF NOT EXISTS telephone VARCHAR(25);
                ALTER TABLE visitors ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
                ALTER TABLE visitors ADD COLUMN IF NOT EXISTS approved_by_id BIGINT REFERENCES users(id_user) ON DELETE SET NULL;
                ALTER TABLE visitors ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
                ALTER TABLE visitors ADD COLUMN IF NOT EXISTS rejected_by_id BIGINT REFERENCES users(id_user) ON DELETE SET NULL;
                ALTER TABLE visitors ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP;
                CREATE INDEX IF NOT EXISTS ix_visitors_status ON visitors(status);
                ALTER TABLE settings ADD COLUMN IF NOT EXISTS sso_client_secret VARCHAR(255);
                ALTER TABLE settings ADD COLUMN IF NOT EXISTS session_timeout_hours INTEGER DEFAULT 8;
            """))
            conn.commit()

    is_testing = bool(os.getenv('PYTEST_CURRENT_TEST')) or app.config.get('TESTING', False) or config_name == 'testing'
    db = get_db_session()
    try:
        seed_initial_data(db, is_testing=is_testing)
    finally:
        db.close()

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(visitor_bp)
    app.register_blueprint(pass_bp)
    app.register_blueprint(setting_bp)

    # Global error handlers
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'success': False, 'message': 'Endpoint tidak ditemukan.'}), 404

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({'success': False, 'message': 'Terjadi kesalahan internal pada server.'}), 500

    @jwt.unauthorized_loader
    def unauthorized_callback(callback):
        return jsonify({'success': False, 'message': 'Token autentikasi tidak ditemukan.'}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(callback):
        return jsonify({'success': False, 'message': 'Token autentikasi tidak valid.'}), 401

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({'success': False, 'message': 'Token autentikasi telah kadaluwarsa.'}), 401

    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({'status': 'ok', 'app': 'Buku Tamu Digital API', 'version': '1.0.0'}), 200

    return app
