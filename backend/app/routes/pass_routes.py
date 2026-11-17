from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from pydantic import ValidationError

from backend.app.models.base import get_db_session
from backend.app.models.entities import Pass, Visitor, AuditLog
from backend.app.schemas.pass_schema import PassCreateRequest, PassStatusUpdateRequest
from backend.app.middleware.auth import role_required

pass_bp = Blueprint('pass', __name__, url_prefix='/api/v1/pass')

@pass_bp.route('', methods=['GET'])
@jwt_required()
def get_all_passes():
    db = get_db_session()
    try:
        passes = db.query(Pass).order_by(Pass.no_pass.asc()).all()
        # Find active visitors holding any pass
        active_visitors = db.query(Visitor).filter(Visitor.check_out_at.is_(None)).all()
        active_holder_map = {v.id_pass: v for v in active_visitors}

        results = []
        for p in passes:
            item = p.to_dict()
            holder = active_holder_map.get(p.id_pass)
            if holder:
                item['current_holder'] = {
                    'id_visitor': holder.id_visitor,
                    'fullname': holder.fullname,
                    'institution': holder.institution,
                    'check_in_at': holder.check_in_at.isoformat() if holder.check_in_at else None,
                }
            else:
                item['current_holder'] = None
            results.append(item)

        return jsonify({
            'success': True,
            'data': results,
            'total': len(results)
        }), 200
    finally:
        db.close()

@pass_bp.route('/available', methods=['GET'])
@jwt_required()
def get_available_passes():
    db = get_db_session()
    try:
        passes = db.query(Pass).filter(Pass.status == 'AVAILABLE').order_by(Pass.no_pass.asc()).all()
        return jsonify({
            'success': True,
            'data': [p.to_dict() for p in passes],
            'total': len(passes)
        }), 200
    finally:
        db.close()

@pass_bp.route('/rack', methods=['GET'])
@jwt_required()
def get_pass_rack_view():
    db = get_db_session()
    try:
        passes = db.query(Pass).order_by(Pass.no_pass.asc()).all()
        active_visitors = db.query(Visitor).filter(Visitor.check_out_at.is_(None)).all()
        holder_map = {v.id_pass: v for v in active_visitors}

        rack_slots = []
        counts = {'AVAILABLE': 0, 'IN_USE': 0, 'MAINTENANCE': 0, 'LOST': 0, 'TOTAL': len(passes)}

        for p in passes:
            counts[p.status] = counts.get(p.status, 0) + 1
            holder = holder_map.get(p.id_pass)
            rack_slots.append({
                'id_pass': p.id_pass,
                'no_pass': p.no_pass,
                'slot': p.slot or f"Slot {p.no_pass}",
                'status': p.status,
                'holder': {
                    'fullname': holder.fullname,
                    'institution': holder.institution,
                    'check_in_at': holder.check_in_at.isoformat()
                } if holder else None
            })

        return jsonify({
            'success': True,
            'summary': counts,
            'data': rack_slots
        }), 200
    finally:
        db.close()

@pass_bp.route('', methods=['POST'])
@role_required('ADMIN')
def create_pass():
    data = request.get_json() or {}
    try:
        req = PassCreateRequest(**data)
    except ValidationError as e:
        return jsonify({'success': False, 'message': 'Validasi gagal.', 'errors': e.errors()}), 422

    user_id = int(get_jwt_identity())
    db = get_db_session()
    try:
        existing = db.query(Pass).filter(Pass.no_pass == req.no_pass.strip()).first()
        if existing:
            return jsonify({'success': False, 'message': f'Nomor pass {req.no_pass} sudah terdaftar.'}), 400

        new_pass = Pass(
            no_pass=req.no_pass.strip(),
            status='AVAILABLE',
            slot=req.slot.strip() if req.slot else None
        )
        db.add(new_pass)

        audit = AuditLog(
            id_user=user_id,
            action='PASS_CREATE',
            entity='pass',
            description=f"Admin menambahkan kartu pass baru #{new_pass.no_pass}"
        )
        db.add(audit)
        db.commit()

        return jsonify({
            'success': True,
            'message': f'Kartu pass #{new_pass.no_pass} berhasil ditambahkan.',
            'data': new_pass.to_dict()
        }), 201
    finally:
        db.close()

@pass_bp.route('/<int:id_pass>/status', methods=['PUT'])
@jwt_required()
def update_pass_status(id_pass: int):
    data = request.get_json() or {}
    try:
        req = PassStatusUpdateRequest(**data)
    except ValidationError as e:
        return jsonify({'success': False, 'message': 'Validasi gagal.', 'errors': e.errors()}), 422

    user_id = int(get_jwt_identity())
    db = get_db_session()
    try:
        pass_card = db.query(Pass).filter(Pass.id_pass == id_pass).first()
        if not pass_card:
            return jsonify({'success': False, 'message': 'Kartu pass tidak ditemukan.'}), 404

        old_status = pass_card.status
        pass_card.status = req.status
        pass_card.updated_at = datetime.utcnow()

        audit = AuditLog(
            id_user=user_id,
            action='PASS_STATUS_CHANGE',
            entity='pass',
            entity_id=str(pass_card.id_pass),
            description=f"Ubah status pass #{pass_card.no_pass} dari {old_status} menjadi {req.status}. Catatan: {req.notes or '-'}"
        )
        db.add(audit)
        db.commit()

        return jsonify({
            'success': True,
            'message': f"Status kartu pass #{pass_card.no_pass} diperbarui menjadi {req.status}.",
            'data': pass_card.to_dict()
        }), 200
    finally:
        db.close()
