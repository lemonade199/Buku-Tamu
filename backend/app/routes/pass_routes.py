from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from pydantic import ValidationError

from backend.app.models.base import get_db_session
from backend.app.models.entities import Pass, Visitor, AuditLog
from backend.app.schemas.pass_schema import PassCreateRequest, PassStatusUpdateRequest
from backend.app.middleware.auth import role_required, permission_required
from backend.app.utils.datetime_utils import utc_now

pass_bp = Blueprint('pass', __name__, url_prefix='/api/v1/pass')

@pass_bp.route('', methods=['GET'])
@permission_required('pass.read')
def get_all_passes():
    db = get_db_session()
    try:
        passes = db.query(Pass).order_by(Pass.no_pass.asc()).all()

        active_visitors = db.query(Visitor).filter(
            Visitor.status == 'APPROVED',
            Visitor.check_out_at.is_(None)
        ).all()
        active_holder_map = {v.id_pass: v for v in active_visitors}

        pending_visitors = db.query(Visitor).filter(
            Visitor.status == 'PENDING'
        ).all()
        pending_holder_map = {v.id_pass: v for v in pending_visitors}

        results = []
        for p in passes:
            item = p.to_dict()
            holder = active_holder_map.get(p.id_pass) or pending_holder_map.get(p.id_pass)
            if holder:
                item['current_holder'] = {
                    'id_visitor': holder.id_visitor,
                    'fullname': holder.fullname,
                    'institution': holder.institution,
                    'status': holder.status,
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
@jwt_required(optional=True)
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
@permission_required('pass.read')
def get_pass_rack_view():
    db = get_db_session()
    try:
        passes = db.query(Pass).order_by(Pass.no_pass.asc()).all()
        active_visitors = db.query(Visitor).filter(
            Visitor.status == 'APPROVED',
            Visitor.check_out_at.is_(None)
        ).all()
        active_map = {v.id_pass: v for v in active_visitors}

        pending_visitors = db.query(Visitor).filter(
            Visitor.status == 'PENDING'
        ).all()
        pending_map = {v.id_pass: v for v in pending_visitors}

        rack_slots = []
        counts = {'AVAILABLE': 0, 'PENDING': 0, 'IN_USE': 0, 'MAINTENANCE': 0, 'LOST': 0, 'TOTAL': len(passes)}

        for p in passes:
            counts[p.status] = counts.get(p.status, 0) + 1
            holder = active_map.get(p.id_pass) or pending_map.get(p.id_pass)
            rack_slots.append({
                'id_pass': p.id_pass,
                'no_pass': p.no_pass,
                'slot': p.slot or f"Slot {p.no_pass}",
                'status': p.status,
                'holder': {
                    'id_visitor': holder.id_visitor,
                    'fullname': holder.fullname,
                    'institution': holder.institution,
                    'status': holder.status,
                    'check_in_at': holder.check_in_at.isoformat() if holder.check_in_at else None
                } if holder else None
            })

        return jsonify({
            'success': True,
            'summary': counts,
            'data': rack_slots
        }), 200
    finally:
        db.close()

@pass_bp.route('/monitoring', methods=['GET'])
@permission_required('pass.read')
def get_pass_monitoring():
    db = get_db_session()
    try:
        available_count = db.query(Pass).filter(Pass.status == 'AVAILABLE').count()
        pending_count = db.query(Pass).filter(Pass.status == 'PENDING').count()
        in_use_count = db.query(Pass).filter(Pass.status == 'IN_USE').count()

        setting = db.query(Setting).first()
        warning_limit = setting.pass_warning_limit if setting and setting.pass_warning_limit else 5
        is_warning = available_count <= warning_limit

        visitors = db.query(Visitor).order_by(Visitor.check_in_at.desc()).limit(150).all()

        checkout_logs = db.query(AuditLog).filter(AuditLog.action == 'VISITOR_CHECKOUT').all()
        checkout_map = {}
        for l in checkout_logs:
            if l.entity_id:
                checkout_map[str(l.entity_id)] = l.user.fullname if l.user else None

        records = []
        for v in visitors:
            if v.status == 'REJECTED':
                continue
            if v.status == 'PENDING':
                status_label = 'Menunggu'
            elif v.check_out_at:
                status_label = 'Selesai'
            else:
                status_label = 'Dipakai'

            raw_no = v.pass_card.no_pass if v.pass_card else str(v.id_pass)
            pass_no = raw_no.zfill(2)
            check_in_time = v.check_in_at.strftime('%H.%M') if v.status == 'APPROVED' and v.check_in_at else '-'
            check_out_time = v.check_out_at.strftime('%H.%M') if v.check_out_at else '-'
            handed_over_by = v.approved_by.fullname if v.approved_by and v.status == 'APPROVED' else '-'
            received_by = checkout_map.get(str(v.id_visitor)) or (handed_over_by if v.check_out_at else '-')

            records.append({
                'id_visitor': v.id_visitor,
                'no_pass': pass_no,
                'guest_name': v.fullname,
                'institution': v.institution or '-',
                'check_in_time': check_in_time,
                'check_out_time': check_out_time,
                'handed_over_by': handed_over_by,
                'received_by': received_by if v.check_out_at else '-',
                'status': status_label,
                'date': v.check_in_at.strftime('%Y-%m-%d') if v.check_in_at else None
            })

        return jsonify({
            'success': True,
            'counts': {
                'available': available_count,
                'pending': pending_count,
                'in_use': in_use_count,
                'warning_limit': warning_limit,
                'is_warning': is_warning
            },
            'data': records
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
        return jsonify({'success': False, 'message': 'Validasi kartu pass gagal.', 'errors': e.errors()}), 422

    db = get_db_session()
    try:
        existing = db.query(Pass).filter(Pass.no_pass == req.no_pass.strip()).first()
        if existing:
            return jsonify({'success': False, 'message': f"Kartu pass dengan nomor '{req.no_pass}' sudah terdaftar."}), 400

        new_pass = Pass(
            no_pass=req.no_pass.strip(),
            slot=req.slot.strip() if req.slot else None,
            status='AVAILABLE'
        )
        db.add(new_pass)
        db.commit()

        return jsonify({
            'success': True,
            'message': f"Kartu pass nomor {new_pass.no_pass} berhasil ditambahkan.",
            'data': new_pass.to_dict()
        }), 201
    finally:
        db.close()

@pass_bp.route('/<int:id_pass>', methods=['PUT'])
@role_required('ADMIN')
def update_pass_details(id_pass: int):
    data = request.get_json() or {}
    no_pass = (data.get('no_pass') or '').strip()
    slot = (data.get('slot') or '').strip()
    kondisi = (data.get('kondisi') or 'Baik').strip()
    is_active = data.get('is_active', True)

    db = get_db_session()
    try:
        pass_card = db.query(Pass).filter(Pass.id_pass == id_pass).first()
        if not pass_card:
            return jsonify({'success': False, 'message': 'Kartu pass tidak ditemukan.'}), 404

        if no_pass:
            existing = db.query(Pass).filter(Pass.no_pass == no_pass, Pass.id_pass != id_pass).first()
            if existing:
                return jsonify({'success': False, 'message': f"Nomor pass '{no_pass}' sudah terdaftar."}), 400
            pass_card.no_pass = no_pass

        pass_card.slot = slot if slot else None

        if not is_active:
            pass_card.status = 'INACTIVE'
        else:
            if kondisi == 'Perlu Perbaikan':
                pass_card.status = 'MAINTENANCE'
            elif kondisi == 'Hilang':
                pass_card.status = 'LOST'
            elif pass_card.status in ['MAINTENANCE', 'LOST', 'INACTIVE']:
                pass_card.status = 'AVAILABLE'

        pass_card.updated_at = utc_now()
        db.commit()

        return jsonify({
            'success': True,
            'message': f"Data kartu pass #{pass_card.no_pass} berhasil disimpan.",
            'data': pass_card.to_dict()
        }), 200
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
        new_status = req.status

        claims = get_jwt()
        user_role = claims.get('role')
        if new_status in ['MAINTENANCE', 'LOST', 'INACTIVE'] and user_role != 'ADMIN':
            return jsonify({
                'success': False,
                'message': f"Akses ditolak: Hanya Administrator yang berwenang mengubah status kartu ke '{new_status}'."
            }), 403

        now = utc_now()

        auto_action_message = None

        if old_status == 'IN_USE' and new_status != 'IN_USE':
            active_visitor = db.query(Visitor).filter(
                Visitor.id_pass == pass_card.id_pass,
                Visitor.status == 'APPROVED',
                Visitor.check_out_at.is_(None)
            ).with_for_update().first()

            if active_visitor:
                active_visitor.check_out_at = now
                active_visitor.updated_at = now
                auto_action_message = f"Tamu ({active_visitor.fullname}) telah otomatis di-check-out."

                checkout_audit = AuditLog(
                    id_user=user_id,
                    action='VISITOR_CHECKOUT',
                    entity='visitors',
                    entity_id=str(active_visitor.id_visitor),
                    description=f"Auto check-out tamu {active_visitor.fullname} saat status pass #{pass_card.no_pass} diubah dari {old_status} menjadi {new_status} oleh user ID {user_id}. Catatan: {req.notes or '-'}"
                )
                db.add(checkout_audit)

        if old_status == 'PENDING' and new_status == 'IN_USE':
            pending_visitor = db.query(Visitor).filter(
                Visitor.id_pass == pass_card.id_pass,
                Visitor.status == 'PENDING'
            ).with_for_update().first()

            if pending_visitor:
                pending_visitor.status = 'APPROVED'
                pending_visitor.approved_by_id = user_id
                pending_visitor.approved_at = now
                pending_visitor.updated_at = now
                auto_action_message = f"Permohonan registrasi tamu ({pending_visitor.fullname}) telah disetujui."

                approve_audit = AuditLog(
                    id_user=user_id,
                    action='VISITOR_REGISTRATION_APPROVED',
                    entity='visitors',
                    entity_id=str(pending_visitor.id_visitor),
                    description=f"Auto approve permohonan tamu {pending_visitor.fullname} saat status pass #{pass_card.no_pass} diubah dari PENDING ke IN_USE."
                )
                db.add(approve_audit)

            pass_card.handled_over_id = user_id
            pass_card.handled_over_at = now

        if old_status == 'PENDING' and new_status == 'AVAILABLE':
            pending_visitor = db.query(Visitor).filter(
                Visitor.id_pass == pass_card.id_pass,
                Visitor.status == 'PENDING'
            ).with_for_update().first()

            if pending_visitor:
                pending_visitor.status = 'REJECTED'
                pending_visitor.rejection_reason = req.notes or 'Dibatalkan melalui perubahan status kartu pass oleh petugas.'
                pending_visitor.rejected_by_id = user_id
                pending_visitor.rejected_at = now
                pending_visitor.updated_at = now
                auto_action_message = f"Permohonan registrasi pending tamu ({pending_visitor.fullname}) telah otomatis dibatalkan/ditolak."

                reject_audit = AuditLog(
                    id_user=user_id,
                    action='VISITOR_REGISTRATION_REJECTED',
                    entity='visitors',
                    entity_id=str(pending_visitor.id_visitor),
                    description=f"Auto reject permohonan tamu {pending_visitor.fullname} saat status pass #{pass_card.no_pass} diubah dari PENDING ke AVAILABLE."
                )
                db.add(reject_audit)

        pass_card.status = new_status
        if new_status == 'AVAILABLE':
            pass_card.achieve_id = user_id
            pass_card.achieve_at = now
        pass_card.updated_at = now

        audit = AuditLog(
            id_user=user_id,
            action='PASS_STATUS_CHANGE',
            entity='pass',
            entity_id=str(pass_card.id_pass),
            description=f"Ubah status pass #{pass_card.no_pass} dari {old_status} menjadi {new_status}. Catatan: {req.notes or '-'}"
        )
        db.add(audit)
        db.commit()

        msg = f"Status kartu pass #{pass_card.no_pass} diperbarui menjadi {new_status}."
        if auto_action_message:
            msg += f" {auto_action_message}"

        return jsonify({
            'success': True,
            'message': msg,
            'data': pass_card.to_dict()
        }), 200
    finally:
        db.close()

@pass_bp.route('/<int:id_pass>/approve', methods=['POST'])
@role_required('ADMIN', 'PETUGAS')
def approve_pass(id_pass: int):
    user_id = int(get_jwt_identity())
    db = get_db_session()
    try:
        pass_card = db.query(Pass).filter(Pass.id_pass == id_pass).with_for_update().first()
        if not pass_card:
            return jsonify({'success': False, 'message': 'Kartu pass tidak ditemukan.'}), 404

        if pass_card.status != 'PENDING':
            return jsonify({'success': False, 'message': f'Kartu pass #{pass_card.no_pass} tidak dalam status PENDING (status saat ini: {pass_card.status}).'}), 400

        now = utc_now()
        pending_visitor = db.query(Visitor).filter(
            Visitor.id_pass == pass_card.id_pass,
            Visitor.status == 'PENDING'
        ).with_for_update().first()

        visitor_name = None
        if pending_visitor:
            pending_visitor.status = 'APPROVED'
            pending_visitor.approved_by_id = user_id
            pending_visitor.approved_at = now
            pending_visitor.updated_at = now
            visitor_name = pending_visitor.fullname

            audit_vis = AuditLog(
                id_user=user_id,
                action='VISITOR_REGISTRATION_APPROVED',
                entity='visitors',
                entity_id=str(pending_visitor.id_visitor),
                description=f"Petugas ID {user_id} menyetujui registrasi tamu {pending_visitor.fullname} via monitoring pass."
            )
            db.add(audit_vis)

        pass_card.status = 'IN_USE'
        pass_card.handled_over_id = user_id
        pass_card.handled_over_at = now
        pass_card.updated_at = now

        audit_pass = AuditLog(
            id_user=user_id,
            action='PASS_STATUS_CHANGE',
            entity='pass',
            entity_id=str(pass_card.id_pass),
            description=f"Kartu pass #{pass_card.no_pass} disetujui menjadi IN_USE oleh user ID {user_id}."
        )
        db.add(audit_pass)
        db.commit()

        msg = f"Kartu pass #{pass_card.no_pass} berhasil disetujui menjadi IN_USE."
        if visitor_name:
            msg += f" Registrasi tamu {visitor_name} telah APPROVED."

        return jsonify({
            'success': True,
            'message': msg,
            'data': pass_card.to_dict()
        }), 200
    finally:
        db.close()

@pass_bp.route('/<int:id_pass>/reject', methods=['POST'])
@role_required('ADMIN', 'PETUGAS')
def reject_pass(id_pass: int):
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    rejection_reason = (data.get('rejection_reason') or data.get('reason') or '').strip()

    if not rejection_reason:
        return jsonify({'success': False, 'message': 'Alasan penolakan wajib diisi.'}), 422

    db = get_db_session()
    try:
        pass_card = db.query(Pass).filter(Pass.id_pass == id_pass).with_for_update().first()
        if not pass_card:
            return jsonify({'success': False, 'message': 'Kartu pass tidak ditemukan.'}), 404

        if pass_card.status != 'PENDING':
            return jsonify({'success': False, 'message': f'Kartu pass #{pass_card.no_pass} tidak dalam status PENDING (status saat ini: {pass_card.status}).'}), 400

        now = utc_now()
        pending_visitor = db.query(Visitor).filter(
            Visitor.id_pass == pass_card.id_pass,
            Visitor.status == 'PENDING'
        ).with_for_update().first()

        visitor_name = None
        if pending_visitor:
            pending_visitor.status = 'REJECTED'
            pending_visitor.rejection_reason = rejection_reason
            pending_visitor.rejected_by_id = user_id
            pending_visitor.rejected_at = now
            pending_visitor.updated_at = now
            visitor_name = pending_visitor.fullname

            audit_vis = AuditLog(
                id_user=user_id,
                action='VISITOR_REGISTRATION_REJECTED',
                entity='visitors',
                entity_id=str(pending_visitor.id_visitor),
                description=f"Petugas ID {user_id} menolak registrasi tamu {pending_visitor.fullname}. Alasan: {rejection_reason}"
            )
            db.add(audit_vis)

        pass_card.status = 'AVAILABLE'
        pass_card.achieve_id = user_id
        pass_card.achieve_at = now
        pass_card.updated_at = now

        audit_pass = AuditLog(
            id_user=user_id,
            action='PASS_STATUS_CHANGE',
            entity='pass',
            entity_id=str(pass_card.id_pass),
            description=f"Kartu pass #{pass_card.no_pass} ditolak dan dikembalikan menjadi AVAILABLE oleh user ID {user_id}. Alasan: {rejection_reason}"
        )
        db.add(audit_pass)
        db.commit()

        msg = f"Kartu pass #{pass_card.no_pass} berhasil ditolak dan kembali AVAILABLE."
        if visitor_name:
            msg += f" Registrasi tamu {visitor_name} telah REJECTED."

        return jsonify({
            'success': True,
            'message': msg,
            'data': pass_card.to_dict()
        }), 200
    finally:
        db.close()
