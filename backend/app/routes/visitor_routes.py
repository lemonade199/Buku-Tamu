import os
from datetime import datetime, date, time
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from pydantic import ValidationError
from sqlalchemy import or_

from backend.app.models.base import get_db_session
from backend.app.models.entities import Visitor
from backend.app.schemas.visitor import CheckinRequest
from backend.app.services.checkin_service import CheckinService
from backend.app.utils.photo_storage import get_photo_path

visitor_bp = Blueprint('visitors', __name__, url_prefix='/api/v1/visitors')

@visitor_bp.route('/checkin', methods=['POST'])
@jwt_required(optional=True)
def checkin_visitor():
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

@visitor_bp.route('', methods=['GET'])
@jwt_required()
def list_visitors():
    search = request.args.get('search', '').strip()
    status = request.args.get('status', '').strip().upper() # ALL, ACTIVE, COMPLETED
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
                    Visitor.telephone.ilike(f"%{search}%"),
                    Visitor.institution.ilike(f"%{search}%"),
                    Visitor.representing.ilike(f"%{search}%")
                )
            )

        if status == 'ACTIVE':
            query = query.filter(Visitor.check_out_at.is_(None))
        elif status == 'COMPLETED':
            query = query.filter(Visitor.check_out_at.isnot(None))

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

@visitor_bp.route('/active', methods=['GET'])
@jwt_required()
def list_active_visitors():
    db = get_db_session()
    try:
        visitors = db.query(Visitor).filter(
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
def get_visitor_photo(id_visitor: int):
    # Safe photo viewer route
    db = get_db_session()
    try:
        visitor = db.query(Visitor).filter(Visitor.id_visitor == id_visitor).first()
        if not visitor or not visitor.capture_id:
            return jsonify({'success': False, 'message': 'Foto tidak ditemukan.'}), 404

        photo_path = get_photo_path(visitor.capture_id)
        if not os.path.exists(photo_path):
            return jsonify({'success': False, 'message': 'File foto fisik tidak ditemukan pada server.'}), 404

        return send_file(photo_path, mimetype='image/jpeg')
    finally:
        db.close()
