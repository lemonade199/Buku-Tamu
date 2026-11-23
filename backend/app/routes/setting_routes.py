import os
import json
from datetime import time
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.app.models.base import get_db_session
from backend.app.models.entities import Setting, AppNotification
from backend.app.middleware.auth import role_required
from backend.app.utils.photo_storage import get_photo_path, save_institution_logo, save_user_avatar
from backend.app.services.backup_service import BackupService
from backend.app.services.email_service import test_smtp_connection, send_monthly_report_email

setting_bp = Blueprint('setting_bp', __name__, url_prefix='/api/v1/settings')

def parse_time_str(time_str: str) -> time:
    if not time_str:
        return time(8, 0)
    cleaned = time_str.strip().replace('.', ':')
    parts = cleaned.split(':')
    h = int(parts[0]) if len(parts) > 0 else 8
    m = int(parts[1]) if len(parts) > 1 else 0
    return time(h, m)

@setting_bp.route('/public', methods=['GET'])
def get_public_settings():
    db = get_db_session()
    try:
        setting = db.query(Setting).first()
        if not setting:
            return jsonify({
                'success': True,
                'data': {
                    'institution_name': 'SEAMOLEC',
                    'logo_path': None,
                    'logo_url': None,
                    'opening_time': '07:30',
                    'closing_time': '16:00'
                }
            }), 200

        logo_url = f"/api/v1/settings/logo/{setting.logo_path}" if setting.logo_path else None
        return jsonify({
            'success': True,
            'data': {
                'institution_name': setting.institution_name or 'SEAMOLEC',
                'logo_path': setting.logo_path,
                'logo_url': logo_url,
                'opening_time': setting.opening_time.strftime('%H:%M') if setting.opening_time else '07:30',
                'closing_time': setting.closing_time.strftime('%H:%M') if setting.closing_time else '16:00',
                'session_timeout_hours': setting.session_timeout_hours or 8
            }
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500
    finally:
        db.close()

@setting_bp.route('', methods=['GET'])
@role_required('ADMIN')
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
@role_required('ADMIN')
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
        if 'smtp_password' in data:
            setting.smtp_password = data['smtp_password']
        if 'smtp_encryption' in data:
            setting.smtp_encryption = data['smtp_encryption']
        if 'smtp_sender_name' in data:
            setting.smtp_sender_name = data['smtp_sender_name']
        if 'smtp_sender_email' in data:
            setting.smtp_sender_email = data['smtp_sender_email']
        if 'smtp_status' in data:
            setting.smtp_status = data['smtp_status']
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
@role_required('ADMIN')
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

        filename = save_institution_logo(photo_base64)

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
        data = request.get_json(silent=True) or {}

        host = data.get('smtp_host') or (setting.smtp_host if setting else None)
        port = data.get('smtp_port') or (setting.smtp_port if setting else 587)
        username = data.get('smtp_username') if 'smtp_username' in data else (setting.smtp_username if setting else None)
        password = data.get('smtp_password') if 'smtp_password' in data else (setting.smtp_password if setting else None)
        encryption = data.get('smtp_encryption') or (setting.smtp_encryption if setting else 'STARTTLS')
        sender_name = data.get('smtp_sender_name') or (setting.smtp_sender_name if setting else 'Buku Tamu Digital')
        sender_email = data.get('smtp_sender_email') or (setting.smtp_sender_email if setting else None)
        recipient_email = data.get('recipient_email') or sender_email or (setting.admin_notification_email if setting else None)

        if not host:
            return jsonify({
                'success': False,
                'status': 'error',
                'message': 'Konfigurasi host SMTP belum diatur.'
            }), 400

        ok, msg = test_smtp_connection(
            host=host,
            port=port,
            username=username,
            password=password,
            encryption=encryption,
            sender_name=sender_name,
            sender_email=sender_email,
            recipient_email=recipient_email
        )

        if setting:
            setting.smtp_status = 'CONNECTED' if ok else 'ERROR'
            db.commit()

        if ok:
            return jsonify({
                'success': True,
                'status': 'connected',
                'message': msg
            }), 200
        else:
            return jsonify({
                'success': False,
                'status': 'error',
                'message': msg
            }), 400
    except Exception as e:
        if 'setting' in locals() and setting:
            try:
                setting.smtp_status = 'ERROR'
                db.commit()
            except Exception:
                db.rollback()
        return jsonify({
            'success': False,
            'status': 'error',
            'message': f"Gagal menguji koneksi SMTP: {str(e)}"
        }), 500
    finally:
        db.close()

@setting_bp.route('/logo/<filename>', methods=['GET'])
def get_logo(filename: str):
    clean_filename = os.path.basename(filename)

    # Strictly block attempts to access visitor photos or staff avatars via logo endpoint
    if clean_filename.startswith(('visitor_', 'avatar_')):
        return jsonify({'success': False, 'message': 'Akses ditolak: File bukan logo institusi.'}), 403

    db = get_db_session()
    try:
        setting = db.query(Setting).first()
        active_logo = setting.logo_path if setting else None
    finally:
        db.close()

    is_allowed = clean_filename.startswith('logo_') or (active_logo and clean_filename == active_logo)
    if not is_allowed:
        return jsonify({'success': False, 'message': 'Akses ditolak: File bukan logo institusi yang sah.'}), 403

    try:
        photo_path = get_photo_path(clean_filename)
        if not os.path.exists(photo_path):
            return jsonify({'success': False, 'message': 'File logo tidak ditemukan.'}), 404
        return send_file(photo_path)
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@setting_bp.route('/backup', methods=['POST'])
@role_required('ADMIN')
def trigger_database_backup():
    identity = get_jwt_identity()
    user_id = int(identity) if identity is not None else None
    ip_addr = request.remote_addr

    db = get_db_session()
    try:
        service = BackupService(db)
        result = service.create_backup(user_id=user_id, ip_address=ip_addr)
        return jsonify({
            'success': True,
            'message': f"Cadangan database berhasil dibuat ({result['filename']}).",
            'data': result
        }), 201
    except Exception as e:
        return jsonify({'success': False, 'message': f"Gagal membuat cadangan database: {str(e)}"}), 500
    finally:
        db.close()

@setting_bp.route('/backups', methods=['GET'])
@role_required('ADMIN')
def list_database_backups():
    db = get_db_session()
    try:
        service = BackupService(db)
        backups = service.list_backups()
        return jsonify({
            'success': True,
            'data': backups,
            'total': len(backups)
        }), 200
    finally:
        db.close()

@setting_bp.route('/backup/download/<filename>', methods=['GET'])
@role_required('ADMIN')
def download_backup_file(filename: str):
    db = get_db_session()
    try:
        service = BackupService(db)
        filepath = service.get_backup_path(filename)
        return send_file(
            filepath,
            as_attachment=True,
            download_name=filename,
            mimetype='application/json'
        )
    except FileNotFoundError:
        return jsonify({'success': False, 'message': 'File cadangan tidak ditemukan.'}), 404
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        db.close()

@setting_bp.route('/backup/<filename>', methods=['DELETE'])
@role_required('ADMIN')
def delete_backup_file(filename: str):
    identity = get_jwt_identity()
    user_id = int(identity) if identity is not None else None
    ip_addr = request.remote_addr

    db = get_db_session()
    try:
        service = BackupService(db)
        service.delete_backup(filename, user_id=user_id, ip_address=ip_addr)
        return jsonify({
            'success': True,
            'message': f"File cadangan '{filename}' berhasil dihapus."
        }), 200
    except FileNotFoundError:
        return jsonify({'success': False, 'message': 'File cadangan tidak ditemukan.'}), 404
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        db.close()

@setting_bp.route('/restore', methods=['POST'])
@role_required('ADMIN')
def restore_database():
    identity = get_jwt_identity()
    user_id = int(identity) if identity is not None else None
    ip_addr = request.remote_addr

    payload = None
    if 'file' in request.files:
        uploaded_file = request.files['file']
        try:
            payload = json.loads(uploaded_file.read().decode('utf-8'))
        except Exception as e:
            return jsonify({'success': False, 'message': f'Format file JSON cadangan tidak valid: {str(e)}'}), 400
    elif request.is_json:
        data = request.get_json() or {}
        if 'filename' in data:
            db_temp = get_db_session()
            try:
                service = BackupService(db_temp)
                filepath = service.get_backup_path(data['filename'])
                with open(filepath, 'r', encoding='utf-8') as f:
                    payload = json.load(f)
            finally:
                db_temp.close()
        elif 'data' in data:
            payload = data
        else:
            return jsonify({'success': False, 'message': 'Format data pemulihan tidak valid.'}), 400
    else:
        return jsonify({'success': False, 'message': 'Harap lampirkan file cadangan atau nama file yang ada.'}), 400

    db = get_db_session()
    try:
        service = BackupService(db)
        result = service.restore_backup(payload, user_id=user_id, ip_address=ip_addr)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': f"Gagal memulihkan database: {str(e)}"}), 500
    finally:
        db.close()

@setting_bp.route('/notifications', methods=['GET'])
@jwt_required()
def get_in_app_notifications():
    db = get_db_session()
    try:
        notifications = db.query(AppNotification).order_by(AppNotification.created_at.desc()).limit(30).all()
        unread_count = db.query(AppNotification).filter(AppNotification.is_read == False).count()
        return jsonify({
            'success': True,
            'unread_count': unread_count,
            'data': [n.to_dict() for n in notifications]
        }), 200
    finally:
        db.close()

@setting_bp.route('/notifications/<int:id_notif>/read', methods=['POST'])
@jwt_required()
def mark_notification_read(id_notif: int):
    db = get_db_session()
    try:
        notif = db.query(AppNotification).filter(AppNotification.id_notification == id_notif).first()
        if notif:
            notif.is_read = True
            db.commit()
        return jsonify({'success': True}), 200
    finally:
        db.close()

@setting_bp.route('/notifications/read-all', methods=['POST'])
@jwt_required()
def mark_all_notifications_read():
    db = get_db_session()
    try:
        db.query(AppNotification).filter(AppNotification.is_read == False).update({'is_read': True})
        db.commit()
        return jsonify({'success': True}), 200
    finally:
        db.close()

@setting_bp.route('/notifications/monthly-report', methods=['POST'])
@role_required('ADMIN')
def trigger_monthly_report_email():
    db = get_db_session()
    try:
        data = request.get_json(silent=True) or {}
        target_email = data.get('recipient_email')
        ok, msg = send_monthly_report_email(db, target_email=target_email)
        if ok:
            return jsonify({'success': True, 'message': msg}), 200
        else:
            return jsonify({'success': False, 'message': msg}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        db.close()
