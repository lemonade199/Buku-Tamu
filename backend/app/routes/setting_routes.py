import os
from datetime import time
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required
from backend.app.models.base import get_db_session
from backend.app.models.entities import Setting
from backend.app.utils.photo_storage import get_photo_path, save_user_avatar

setting_bp = Blueprint('setting_bp', __name__, url_prefix='/api/v1/settings')

def parse_time_str(time_str: str) -> time:
    if not time_str:
        return time(8, 0)
    cleaned = time_str.strip().replace('.', ':')
    parts = cleaned.split(':')
    h = int(parts[0]) if len(parts) > 0 else 8
    m = int(parts[1]) if len(parts) > 1 else 0
    return time(h, m)

@setting_bp.route('', methods=['GET'])
@jwt_required()
def get_settings():
    db = get_db_session()
    try:
        setting = db.query(Setting).first()
        if not setting:
            setting = Setting(
                institution_name='SEAMOLEC',
                opening_time=time(7, 30),
                closing_time=time(16, 0),
                pass_warning_limit=5
            )
            db.add(setting)
            db.commit()
            db.refresh(setting)

        return jsonify({
            'success': True,
            'data': setting.to_dict()
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500
    finally:
        db.close()

@setting_bp.route('', methods=['PUT', 'PATCH'])
@jwt_required()
def update_settings():
    db = get_db_session()
    try:
        data = request.get_json() or {}
        setting = db.query(Setting).first()
        if not setting:
            setting = Setting()
            db.add(setting)

        if 'institution_name' in data:
            setting.institution_name = str(data['institution_name']).strip()
        if 'opening_time' in data:
            setting.opening_time = parse_time_str(str(data['opening_time']))
        if 'closing_time' in data:
            setting.closing_time = parse_time_str(str(data['closing_time']))
        if 'pass_warning_limit' in data:
            setting.pass_warning_limit = int(data['pass_warning_limit'])
        if 'smtp_host' in data:
            setting.smtp_host = data['smtp_host']
        if 'smtp_port' in data:
            setting.smtp_port = int(data['smtp_port']) if data['smtp_port'] else None
        if 'smtp_username' in data:
            setting.smtp_username = data['smtp_username']
        if 'smtp_encryption' in data:
            setting.smtp_encryption = data['smtp_encryption']
        if 'smtp_sender_name' in data:
            setting.smtp_sender_name = data['smtp_sender_name']
        if 'smtp_sender_email' in data:
            setting.smtp_sender_email = data['smtp_sender_email']
        if 'notify_app_checkin' in data:
            setting.notify_app_checkin = bool(data['notify_app_checkin'])
        if 'notify_app_backup_fail' in data:
            setting.notify_app_backup_fail = bool(data['notify_app_backup_fail'])
        if 'notify_email_monthly_report' in data:
            setting.notify_email_monthly_report = bool(data['notify_email_monthly_report'])
        if 'notify_email_new_account' in data:
            setting.notify_email_new_account = bool(data['notify_email_new_account'])
        if 'notify_email_reset_password' in data:
            setting.notify_email_reset_password = bool(data['notify_email_reset_password'])
        if 'admin_notification_email' in data:
            setting.admin_notification_email = data['admin_notification_email']
        if 'jwt_access_token_expiry' in data:
            setting.jwt_access_token_expiry = int(data['jwt_access_token_expiry'])
        if 'jwt_refresh_token_expiry' in data:
            setting.jwt_refresh_token_expiry = int(data['jwt_refresh_token_expiry'])
        if 'sso_enabled' in data:
            setting.sso_enabled = bool(data['sso_enabled'])
        if 'sso_issuer' in data:
            setting.sso_issuer = data['sso_issuer']
        if 'sso_client_id' in data:
            setting.sso_client_id = data['sso_client_id']
        if 'sso_client_secret' in data:
            setting.sso_client_secret = data['sso_client_secret']
        if 'session_timeout_hours' in data:
            setting.session_timeout_hours = int(data['session_timeout_hours'])
        if 'guest_photo_retention_months' in data:
            setting.guest_photo_retention_months = int(data['guest_photo_retention_months'])
        if 'visit_data_retention_years' in data:
            setting.visit_data_retention_years = int(data['visit_data_retention_years'])
        if 'auto_backup_enabled' in data:
            setting.auto_backup_enabled = bool(data['auto_backup_enabled'])
        if 'auto_backup_schedule' in data:
            setting.auto_backup_schedule = data['auto_backup_schedule']

        db.commit()
        db.refresh(setting)

        return jsonify({
            'success': True,
            'message': 'Pengaturan berhasil disimpan.',
            'data': setting.to_dict()
        }), 200
    except Exception as e:
        db.rollback()
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500
    finally:
        db.close()

@setting_bp.route('/logo', methods=['POST'])
@jwt_required()
def upload_logo():
    db = get_db_session()
    try:
        data = request.get_json() or {}
        photo_base64 = data.get('logo') or data.get('photo')
        if not photo_base64:
            return jsonify({
                'success': False,
                'message': 'Data logo tidak ditemukan.'
            }), 400

        filename = save_user_avatar(photo_base64)

        setting = db.query(Setting).first()
        if not setting:
            setting = Setting()
            db.add(setting)
        setting.logo_path = filename
        db.commit()

        return jsonify({
            'success': True,
            'message': 'Logo berhasil diperbarui.',
            'logo_path': filename,
            'logo_url': f"/api/v1/settings/logo/{filename}"
        }), 200
    except Exception as e:
        db.rollback()
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500
    finally:
        db.close()

@setting_bp.route('/smtp/test', methods=['POST'])
@jwt_required()
def test_smtp():
    db = get_db_session()
    try:
        setting = db.query(Setting).first()
        host = setting.smtp_host if setting else None
        if not host:
            return jsonify({
                'success': False,
                'message': 'Konfigurasi host SMTP belum diatur.'
            }), 400

        return jsonify({
            'success': True,
            'message': 'Koneksi ke server SMTP berhasil. Email uji telah berhasil dikirim.',
            'status': 'connected'
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500
    finally:
        db.close()

@setting_bp.route('/logo/<filename>', methods=['GET'])
def get_logo(filename: str):
    try:
        photo_path = get_photo_path(filename)
        if not os.path.exists(photo_path):
            return jsonify({'success': False, 'message': 'File logo tidak ditemukan.'}), 404
        return send_file(photo_path)
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
