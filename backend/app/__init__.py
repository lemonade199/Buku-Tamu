import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from backend.config import config_by_name
from backend.app.models.base import Base, init_db, get_db_session
from backend.app.services.seed_service import seed_initial_data
from backend.app.routes.auth_routes import auth_bp
from backend.app.routes.dashboard_routes import dashboard_bp

jwt = JWTManager()

def create_app(config_name=None):
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')

    app = Flask(__name__)
    app.config.from_object(config_by_name.get(config_name, config_by_name['default']))

    # Initialize extensions
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)
    jwt.init_app(app)

    # Initialize database engine & session
    engine, _ = init_db()
    Base.metadata.create_all(bind=engine)

    # Seed initial roles, users, and passes
    db = get_db_session()
    try:
        seed_initial_data(db)
    finally:
        db.close()

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)

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
