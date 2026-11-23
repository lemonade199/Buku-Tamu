import os
import time as sys_time
from collections import defaultdict
from datetime import datetime, date, time
from flask import Blueprint, request, jsonify, send_file, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from pydantic import ValidationError
from sqlalchemy import or_

from backend.app.models.base import get_db_session
from backend.app.models.entities import Visitor
from backend.app.schemas.visitor import CheckinRequest, CheckoutRequest, RejectRegistrationRequest
from backend.app.services.checkin_service import CheckinService
from backend.app.services.checkout_service import CheckoutService
from backend.app.middleware.auth import role_required
from backend.app.utils.photo_storage import get_photo_path
from backend.app.utils.export_service import generate_excel, generate_pdf

visitor_bp = Blueprint('visitors', __name__, url_prefix='/api/v1/visitors')

# In-memory rate limiting for public kiosk checkin
_checkin_attempts = defaultdict(list)
_MAX_CHECKIN_PER_MINUTE = 15
_CHECKIN_LOCKOUT_SECONDS = 60

def _is_checkin_rate_limited(ip: str) -> bool:
    if current_app and current_app.config.get('TESTING') and not current_app.config.get('TEST_RATE_LIMIT'):
        return False
    now = sys_time.time()
    _checkin_attempts[ip] = [ts for ts in _checkin_attempts[ip] if now - ts < _CHECKIN_LOCKOUT_SECONDS]
    return len(_checkin_attempts[ip]) >= _MAX_CHECKIN_PER_MINUTE

def _record_checkin_attempt(ip: str):
    now = sys_time.time()
    _checkin_attempts[ip].append(now)

@visitor_bp.route('/checkin', methods=['POST'])
@jwt_required(optional=True)
def checkin_visitor():
    client_ip = request.remote_addr or 'unknown'
    if _is_checkin_rate_limited(client_ip):
        return jsonify({
            'success': False,
            'message': 'Terlalu banyak permintaan check-in dari perangkat Anda. Silakan coba kembali dalam 1 menit.',
            'code': 'TOO_MANY_REQUESTS'
        }), 429

    _record_checkin_attempt(client_ip)

    data = request.get_json() or {}
    try:
        req = CheckinRequest(**data)
    except ValidationError as e:
        return jsonify({
            'success': False,
            'message': 'Validasi formulir check-in gagal.',
            'errors': e.errors()
        }), 422

    identity = get_jwt_identity()
    user_id = int(identity) if identity is not None else None
    ip_addr = request.remote_addr
    user_agent = request.headers.get('User-Agent')

    db = get_db_session()
    try:
        service = CheckinService(db)
        result = service.process_checkin(
            data=req.model_dump(),
            handled_by_user_id=user_id,
            ip_address=ip_addr,
            user_agent=user_agent
        )
        return jsonify({
            'success': True,
            'message': result['message'],
            'data': result
        }), 201
    except ValueError as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f"Terjadi kesalahan saat memproses check-in: {str(e)}"
        }), 500
    finally:
        db.close()

@visitor_bp.route('/pending', methods=['GET'])
@role_required('ADMIN', 'PETUGAS')
def list_pending_registrations():
    db = get_db_session()
    try:
        visitors = db.query(Visitor).filter(
            Visitor.status == 'PENDING'
        ).order_by(Visitor.check_in_at.asc()).all()

        return jsonify({
            'success': True,
            'data': [v.to_dict() for v in visitors],
            'total': len(visitors)
        }), 200
    finally:
        db.close()

@visitor_bp.route('/<int:id_visitor>/approve', methods=['POST'])
@role_required('ADMIN', 'PETUGAS')
def approve_visitor_registration(id_visitor: int):
    user_id = int(get_jwt_identity())
    ip_addr = request.remote_addr
    user_agent = request.headers.get('User-Agent')

    db = get_db_session()
    try:
        service = CheckinService(db)
        result = service.approve_registration(
            id_visitor=id_visitor,
            approved_by_user_id=user_id,
            ip_address=ip_addr,
            user_agent=user_agent
        )
        return jsonify({
            'success': True,
            'message': result['message'],
            'data': result
        }), 200
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': f"Gagal menyetujui registrasi: {str(e)}"}), 500
    finally:
        db.close()

@visitor_bp.route('/<int:id_visitor>/reject', methods=['POST'])
@role_required('ADMIN', 'PETUGAS')
def reject_visitor_registration(id_visitor: int):
    data = request.get_json(silent=True) or {}
    try:
        req = RejectRegistrationRequest(**data)
    except ValidationError as e:
        return jsonify({
            'success': False,
            'message': 'Alasan penolakan registrasi wajib diisi.',
            'errors': e.errors()
        }), 422

    user_id = int(get_jwt_identity())
    ip_addr = request.remote_addr
    user_agent = request.headers.get('User-Agent')

    db = get_db_session()
    try:
        service = CheckinService(db)
        result = service.reject_registration(
            id_visitor=id_visitor,
            rejected_by_user_id=user_id,
            reason=req.reason,
            ip_address=ip_addr,
            user_agent=user_agent
        )
        return jsonify({
            'success': True,
            'message': result['message'],
            'data': result
        }), 200
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': f"Gagal menolak registrasi: {str(e)}"}), 500
    finally:
        db.close()

@visitor_bp.route('/<int:id_visitor>/status', methods=['GET'])
def get_visitor_status_public(id_visitor: int):
    db = get_db_session()
    try:
        visitor = db.query(Visitor).filter(Visitor.id_visitor == id_visitor).first()
        if not visitor:
            return jsonify({'success': False, 'message': 'Data pengunjung tidak ditemukan.'}), 404

        return jsonify({
            'success': True,
            'data': {
                'id_visitor': visitor.id_visitor,
                'fullname': visitor.fullname,
                'no_pass': visitor.pass_card.no_pass if visitor.pass_card else None,
                'status': visitor.status,
                'rejection_reason': visitor.rejection_reason,
                'approved_at': visitor.approved_at.isoformat() if visitor.approved_at else None,
                'rejected_at': visitor.rejected_at.isoformat() if visitor.rejected_at else None,
                'check_in_at': visitor.check_in_at.isoformat() if visitor.check_in_at else None,
                'is_active': visitor.status == 'APPROVED' and visitor.check_out_at is None
            }
        }), 200
    finally:
        db.close()

@visitor_bp.route('', methods=['GET'])
@jwt_required()
def list_visitors():
    search = request.args.get('search', '').strip()
    status = request.args.get('status', '').strip().upper()
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))

    db = get_db_session()
    try:
        query = db.query(Visitor)

        if search:
            query = query.filter(
                or_(
                    Visitor.fullname.ilike(f"%{search}%"),
                    Visitor.institution.ilike(f"%{search}%"),
                    Visitor.representing.ilike(f"%{search}%")
                )
            )

        if status == 'ACTIVE':
            query = query.filter(Visitor.status == 'APPROVED', Visitor.check_out_at.is_(None))
        elif status == 'COMPLETED':
            query = query.filter(Visitor.status == 'APPROVED', Visitor.check_out_at.isnot(None))
        elif status == 'PENDING':
            query = query.filter(Visitor.status == 'PENDING')
        elif status == 'REJECTED':
            query = query.filter(Visitor.status == 'REJECTED')
        elif status == 'APPROVED':
            query = query.filter(Visitor.status == 'APPROVED')

        s_date = None
        e_date = None

        if start_date_str:
            try:
                s_date = datetime.strptime(start_date_str, '%Y-%m-%d')
            except ValueError:
                pass

        if end_date_str:
            try:
                e_date = datetime.strptime(end_date_str, '%Y-%m-%d')
            except ValueError:
                pass

        if s_date and e_date and e_date < s_date:
            return jsonify({
                'success': False,
                'message': 'Tanggal selesai tidak bisa kurang dari tanggal masuk/mulai.'
            }), 422

        if s_date:
            query = query.filter(Visitor.check_in_at >= s_date)
        if e_date:
            query = query.filter(Visitor.check_in_at <= datetime.combine(e_date.date(), time.max))

        total = query.count()
        visitors = query.order_by(Visitor.check_in_at.desc()).offset((page - 1) * limit).limit(limit).all()

        return jsonify({
            'success': True,
            'data': [v.to_dict() for v in visitors],
            'meta': {
                'page': page,
                'limit': limit,
                'total': total
            }
        }), 200
    finally:
        db.close()

@visitor_bp.route('/export/excel', methods=['GET'])
@role_required('ADMIN', 'PETUGAS')
def export_visitors_excel():
    search = request.args.get('search', '').strip()
    status = request.args.get('status', '').strip().upper()
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')

    db = get_db_session()
    try:
        query = db.query(Visitor)

        if search:
            query = query.filter(
                or_(
                    Visitor.fullname.ilike(f"%{search}%"),
                    Visitor.institution.ilike(f"%{search}%"),
                    Visitor.representing.ilike(f"%{search}%")
                )
            )

        if status == 'ACTIVE':
            query = query.filter(Visitor.status == 'APPROVED', Visitor.check_out_at.is_(None))
        elif status == 'COMPLETED':
            query = query.filter(Visitor.status == 'APPROVED', Visitor.check_out_at.isnot(None))
        elif status == 'PENDING':
            query = query.filter(Visitor.status == 'PENDING')
        elif status == 'REJECTED':
            query = query.filter(Visitor.status == 'REJECTED')
        elif status == 'APPROVED':
            query = query.filter(Visitor.status == 'APPROVED')

        if start_date_str:
            try:
                s_date = datetime.strptime(start_date_str, '%Y-%m-%d')
                query = query.filter(Visitor.check_in_at >= s_date)
            except ValueError:
                pass

        if end_date_str:
            try:
                e_date = datetime.strptime(end_date_str, '%Y-%m-%d')
                query = query.filter(Visitor.check_in_at <= datetime.combine(e_date.date(), time.max))
            except ValueError:
                pass

        visitors = query.order_by(Visitor.check_in_at.desc()).all()
        visitor_dicts = [v.to_dict() for v in visitors]
        buf = generate_excel(visitor_dicts)
        filename = f"laporan_kunjungan_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        return send_file(
            buf,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            as_attachment=True,
            download_name=filename
        )
    finally:
        db.close()

@visitor_bp.route('/export/pdf', methods=['GET'])
@role_required('ADMIN', 'PETUGAS')
def export_visitors_pdf():
    search = request.args.get('search', '').strip()
    status = request.args.get('status', '').strip().upper()
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')

    db = get_db_session()
    try:
        query = db.query(Visitor)

        if search:
            query = query.filter(
                or_(
                    Visitor.fullname.ilike(f"%{search}%"),
                    Visitor.institution.ilike(f"%{search}%"),
                    Visitor.representing.ilike(f"%{search}%")
                )
            )

        if status == 'ACTIVE':
            query = query.filter(Visitor.status == 'APPROVED', Visitor.check_out_at.is_(None))
        elif status == 'COMPLETED':
            query = query.filter(Visitor.status == 'APPROVED', Visitor.check_out_at.isnot(None))
        elif status == 'PENDING':
            query = query.filter(Visitor.status == 'PENDING')
        elif status == 'REJECTED':
            query = query.filter(Visitor.status == 'REJECTED')
        elif status == 'APPROVED':
            query = query.filter(Visitor.status == 'APPROVED')

        if start_date_str:
            try:
                s_date = datetime.strptime(start_date_str, '%Y-%m-%d')
                query = query.filter(Visitor.check_in_at >= s_date)
            except ValueError:
                pass

        if end_date_str:
            try:
                e_date = datetime.strptime(end_date_str, '%Y-%m-%d')
                query = query.filter(Visitor.check_in_at <= datetime.combine(e_date.date(), time.max))
            except ValueError:
                pass

        visitors = query.order_by(Visitor.check_in_at.desc()).all()
        visitor_dicts = [v.to_dict() for v in visitors]
        buf = generate_pdf(visitor_dicts)
        filename = f"laporan_kunjungan_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        return send_file(
            buf,
            mimetype="application/pdf",
            as_attachment=True,
            download_name=filename
        )
    finally:
        db.close()

@visitor_bp.route('/active', methods=['GET'])
@jwt_required()
def list_active_visitors():
    db = get_db_session()
    try:
        visitors = db.query(Visitor).filter(
            Visitor.status == 'APPROVED',
            Visitor.check_out_at.is_(None)
        ).order_by(Visitor.check_in_at.desc()).all()

        return jsonify({
            'success': True,
            'data': [v.to_dict() for v in visitors],
            'total': len(visitors)
        }), 200
    finally:
        db.close()

@visitor_bp.route('/<int:id_visitor>', methods=['GET'])
@jwt_required()
def get_visitor_detail(id_visitor: int):
    db = get_db_session()
    try:
        visitor = db.query(Visitor).filter(Visitor.id_visitor == id_visitor).first()
        if not visitor:
            return jsonify({'success': False, 'message': 'Data pengunjung tidak ditemukan.'}), 404
        return jsonify({'success': True, 'data': visitor.to_dict()}), 200
    finally:
        db.close()

@visitor_bp.route('/<int:id_visitor>/photo', methods=['GET'])
@jwt_required()
def get_visitor_photo(id_visitor: int):
    db = get_db_session()
    try:
        visitor = db.query(Visitor).filter(Visitor.id_visitor == id_visitor).first()
        if not visitor or not visitor.capture_id:
            return jsonify({'success': False, 'message': 'Foto tidak ditemukan.'}), 404

        photo_path = os.path.abspath(get_photo_path(visitor.capture_id))
        if not os.path.exists(photo_path):
            return jsonify({'success': False, 'message': 'File foto fisik tidak ditemukan pada server.'}), 404

        return send_file(photo_path, mimetype='image/jpeg')
    finally:
        db.close()

@visitor_bp.route('/<int:id_visitor>/checkout', methods=['POST'])
@jwt_required()
def checkout_visitor_by_id(id_visitor: int):
    identity = get_jwt_identity()
    user_id = int(identity) if identity is not None else None
    ip_addr = request.remote_addr
    user_agent = request.headers.get('User-Agent')
    data = request.get_json(silent=True) or {}
    notes = data.get('notes')

    db = get_db_session()
    try:
        service = CheckoutService(db)
        result = service.process_checkout(
            id_visitor=id_visitor,
            handled_by_user_id=user_id,
            notes=notes,
            ip_address=ip_addr,
            user_agent=user_agent
        )
        return jsonify({
            'success': True,
            'message': result['message'],
            'data': result
        }), 200
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': f"Terjadi kesalahan saat memproses check-out: {str(e)}"}), 500
    finally:
        db.close()

@visitor_bp.route('/checkout', methods=['POST'])
@jwt_required()
def checkout_visitor_general():
    data = request.get_json(silent=True) or {}
    try:
        req = CheckoutRequest(**data)
    except ValidationError as e:
        return jsonify({
            'success': False,
            'message': 'Validasi check-out gagal.',
            'errors': e.errors()
        }), 422

    identity = get_jwt_identity()
    user_id = int(identity) if identity is not None else None
    ip_addr = request.remote_addr
    user_agent = request.headers.get('User-Agent')

    db = get_db_session()
    try:
        service = CheckoutService(db)
        result = service.process_checkout(
            id_visitor=req.id_visitor,
            no_pass=req.no_pass,
            handled_by_user_id=user_id,
            notes=req.notes,
            ip_address=ip_addr,
            user_agent=user_agent
        )
        return jsonify({
            'success': True,
            'message': result['message'],
            'data': result
        }), 200
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': f"Terjadi kesalahan saat memproses check-out: {str(e)}"}), 500
    finally:
        db.close()
