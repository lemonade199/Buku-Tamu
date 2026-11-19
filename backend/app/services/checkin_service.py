import os
from datetime import datetime
from sqlalchemy.orm import Session
from backend.app.models.entities import Visitor, Pass, AuditLog
from backend.app.utils.photo_storage import save_visitor_photo
from backend.app.utils.datetime_utils import utc_now

class CheckinService:
    def __init__(self, db: Session):
        self.db = db

    def process_checkin(self, data: dict, handled_by_user_id: int = None, ip_address: str = None, user_agent: str = None) -> dict:
        photo_base64 = data.get('photo_base64')
        if not photo_base64:
            raise ValueError("Foto pengunjung wajib diambil melalui kamera sebelum registrasi.")

        pass_card = None
        id_pass = data.get('id_pass')
        no_pass = data.get('no_pass')

        if id_pass:
            pass_card = self.db.query(Pass).filter(Pass.id_pass == id_pass).with_for_update().first()
        elif no_pass:
            pass_card = self.db.query(Pass).filter(Pass.no_pass == str(no_pass).strip()).with_for_update().first()
        else:
            pass_card = self.db.query(Pass).filter(Pass.status == 'AVAILABLE').order_by(Pass.no_pass.asc()).with_for_update().first()

        if not pass_card:
            raise ValueError("Kartu pass yang dipilih tidak ditemukan.")

        if pass_card.status != 'AVAILABLE':
            raise ValueError(f"Kartu pass nomor {pass_card.no_pass} sedang tidak tersedia (status: {pass_card.status}).")

        pending_visit = self.db.query(Visitor).filter(
            Visitor.id_pass == pass_card.id_pass,
            Visitor.status == 'PENDING'
        ).first()
        if pending_visit:
            raise ValueError(f"Kartu pass {pass_card.no_pass} sedang menunggu persetujuan pengunjung lain ({pending_visit.fullname}).")

        active_visit = self.db.query(Visitor).filter(
            Visitor.id_pass == pass_card.id_pass,
            Visitor.status == 'APPROVED',
            Visitor.check_out_at.is_(None)
        ).first()
        if active_visit:
            raise ValueError(f"Kartu pass {pass_card.no_pass} masih digunakan oleh pengunjung lain ({active_visit.fullname}).")

        try:
            photo_filename = save_visitor_photo(photo_base64)
        except Exception as e:
            raise ValueError(f"Gagal memproses foto pengunjung: {str(e)}")

        now = utc_now()
        telephone_val = (data.get('telephone') or '').strip() or None
        institution_val = (data.get('institution') or '').strip() or None
        representing_val = (data.get('representing') or '').strip() or None
        purpose_val = (data.get('purpose') or '').strip() or None

        visitor = Visitor(
            id_pass=pass_card.id_pass,
            fullname=data['fullname'].strip(),
            telephone=telephone_val,
            institution=institution_val,
            representing=representing_val,
            purpose=purpose_val,
            status='PENDING',
            check_in_at=now,
            capture_id=photo_filename
        )
        self.db.add(visitor)

        pass_card.status = 'PENDING'
        pass_card.updated_at = now

        audit = AuditLog(
            id_user=handled_by_user_id,
            action='VISITOR_REGISTER_PENDING',
            entity='visitors',
            description=f"Registrasi tamu baru {visitor.fullname} dengan kartu pass #{pass_card.no_pass} menunggu konfirmasi resepsionis",
            ip_address=ip_address,
            user_agent=user_agent
        )
        self.db.add(audit)
        self.db.commit()

        return {
            'id_visitor': visitor.id_visitor,
            'fullname': visitor.fullname,
            'telephone': visitor.telephone,
            'id_pass': pass_card.id_pass,
            'no_pass': pass_card.no_pass,
            'slot': pass_card.slot,
            'status': 'PENDING',
            'check_in_at': visitor.check_in_at.isoformat(),
            'capture_id': visitor.capture_id,
            'message': f"Registrasi berhasil diajukan. Kartu pass #{pass_card.no_pass} sedang menunggu konfirmasi resepsionis."
        }

    def approve_registration(self, id_visitor: int, approved_by_user_id: int, ip_address: str = None, user_agent: str = None) -> dict:
        visitor = self.db.query(Visitor).filter(Visitor.id_visitor == id_visitor).with_for_update().first()
        if not visitor:
            raise ValueError("Data permohonan registrasi tidak ditemukan.")

        if visitor.status != 'PENDING':
            raise ValueError(f"Permohonan registrasi ini sudah diproses sebelumnya (status saat ini: {visitor.status}).")

        pass_card = self.db.query(Pass).filter(Pass.id_pass == visitor.id_pass).with_for_update().first()
        if not pass_card:
            raise ValueError("Kartu pass terkait tidak ditemukan.")

        now = utc_now()
        visitor.status = 'APPROVED'
        visitor.approved_by_id = approved_by_user_id
        visitor.approved_at = now
        visitor.check_in_at = now
        visitor.updated_at = now

        pass_card.status = 'IN_USE'
        pass_card.handled_over_id = approved_by_user_id
        pass_card.handled_over_at = now
        pass_card.updated_at = now

        audit = AuditLog(
            id_user=approved_by_user_id,
            action='VISITOR_REGISTRATION_APPROVED',
            entity='visitors',
            entity_id=str(visitor.id_visitor),
            description=f"Registrasi tamu {visitor.fullname} disetujui. Kartu pass #{pass_card.no_pass} berstatus IN_USE.",
            ip_address=ip_address,
            user_agent=user_agent
        )
        self.db.add(audit)
        self.db.commit()

        return {
            'id_visitor': visitor.id_visitor,
            'fullname': visitor.fullname,
            'status': 'APPROVED',
            'id_pass': pass_card.id_pass,
            'no_pass': pass_card.no_pass,
            'pass_status': 'IN_USE',
            'approved_at': visitor.approved_at.isoformat(),
            'message': f"Registrasi tamu {visitor.fullname} berhasil disetujui. Kartu pass #{pass_card.no_pass} sekarang aktif digunakan."
        }

    def reject_registration(self, id_visitor: int, rejected_by_user_id: int, reason: str, ip_address: str = None, user_agent: str = None) -> dict:
        if not reason or not reason.strip():
            raise ValueError("Alasan penolakan registrasi wajib diisi.")

        visitor = self.db.query(Visitor).filter(Visitor.id_visitor == id_visitor).with_for_update().first()
        if not visitor:
            raise ValueError("Data permohonan registrasi tidak ditemukan.")

        if visitor.status != 'PENDING':
            raise ValueError(f"Permohonan registrasi ini sudah diproses sebelumnya (status saat ini: {visitor.status}).")

        pass_card = self.db.query(Pass).filter(Pass.id_pass == visitor.id_pass).with_for_update().first()

        now = utc_now()
        visitor.status = 'REJECTED'
        visitor.rejection_reason = reason.strip()
        visitor.rejected_by_id = rejected_by_user_id
        visitor.rejected_at = now
        visitor.updated_at = now

        if pass_card:
            pass_card.status = 'AVAILABLE'
            pass_card.updated_at = now

        audit = AuditLog(
            id_user=rejected_by_user_id,
            action='VISITOR_REGISTRATION_REJECTED',
            entity='visitors',
            entity_id=str(visitor.id_visitor),
            description=f"Registrasi tamu {visitor.fullname} ditolak dengan alasan: {visitor.rejection_reason}. Kartu pass #{pass_card.no_pass if pass_card else '-'} dikembalikan ke AVAILABLE.",
            ip_address=ip_address,
            user_agent=user_agent
        )
        self.db.add(audit)
        self.db.commit()

        return {
            'id_visitor': visitor.id_visitor,
            'fullname': visitor.fullname,
            'status': 'REJECTED',
            'rejection_reason': visitor.rejection_reason,
            'rejected_at': visitor.rejected_at.isoformat(),
            'pass_status': 'AVAILABLE',
            'message': f"Registrasi tamu {visitor.fullname} telah ditolak. Kartu pass telah dikembalikan ke status AVAILABLE."
        }
