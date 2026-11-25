import os
from datetime import datetime, time, timedelta, timezone
from flask import current_app
from sqlalchemy import and_, exists, or_
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.models.entities import Visitor, Pass, AuditLog, Setting, AppNotification
from backend.app.utils.photo_storage import save_visitor_photo
from backend.app.utils.datetime_utils import utc_now


def assignable_pass_query(db: Session):
    """Kartu AVAILABLE yang tidak sedang terikat tamu PENDING atau tamu aktif yang belum check-out."""
    still_held = exists().where(and_(
        Visitor.id_pass == Pass.id_pass,
        or_(
            Visitor.status == 'PENDING',
            and_(Visitor.status == 'APPROVED', Visitor.check_out_at.is_(None)),
        ),
    ))
    return db.query(Pass).filter(Pass.status == 'AVAILABLE', ~still_held).order_by(Pass.no_pass.asc())

class CheckinService:
    def __init__(self, db: Session):
        self.db = db

    def process_checkin(self, data: dict, handled_by_user_id: int = None, ip_address: str = None, user_agent: str = None) -> dict:
        # Check operational hours for self-service / kiosk registrations
        is_testing = bool(current_app and current_app.config.get('TESTING'))
        if not is_testing and handled_by_user_id is None and not data.get('bypass_operational_hours'):
            setting = self.db.query(Setting).first()
            if setting and setting.opening_time and setting.closing_time:
                # Jam server Docker memakai UTC; jam operasional diatur dalam WIB (UTC+7, tanpa musim panas).
                now_time = datetime.now(timezone(timedelta(hours=7))).time()
                op_open = setting.opening_time
                op_close = setting.closing_time
                if op_open <= op_close:
                    is_open = op_open <= now_time <= op_close
                else:
                    is_open = now_time >= op_open or now_time <= op_close

                if not is_open:
                    raise ValueError(
                        f"Pendaftaran tamu mandiri saat ini ditutup di luar jam operasional "
                        f"({op_open.strftime('%H:%M')} - {op_close.strftime('%H:%M')} WIB). "
                        f"Silakan hubungi petugas resepsionis di meja informasi."
                    )

        photo_base64 = data.get('photo_base64')
        if not photo_base64:
            raise ValueError("Foto pengunjung wajib diambil melalui kamera sebelum registrasi.")

        fullname = (data.get('fullname') or '').strip()
        if not fullname:
            raise ValueError("Nama lengkap pengunjung wajib diisi.")

        # Validasi anti-duplikasi nama:
        # 1. Cek apakah ada tamu dengan nama yang sama yang masih aktif berada di dalam gedung (APPROVED & belum check-out)
        active_duplicate = self.db.query(Visitor).filter(
            func.lower(Visitor.fullname) == fullname.lower(),
            Visitor.status == 'APPROVED',
            Visitor.check_out_at.is_(None)
        ).first()
        if active_duplicate:
            card_no = active_duplicate.pass_card.no_pass if active_duplicate.pass_card else str(active_duplicate.id_pass)
            raise ValueError(
                f"Pengunjung dengan nama '{fullname}' saat ini masih tercatat aktif di dalam gedung (Kartu pass #{card_no}). "
                f"Harap lakukan check-out terlebih dahulu sebelum mendaftar kembali."
            )

        # 2. Cek apakah ada tamu dengan nama yang sama yang sedang dalam antrean verifikasi (PENDING)
        pending_duplicate = self.db.query(Visitor).filter(
            func.lower(Visitor.fullname) == fullname.lower(),
            Visitor.status == 'PENDING'
        ).first()
        if pending_duplicate:
            card_no = pending_duplicate.pass_card.no_pass if pending_duplicate.pass_card else str(pending_duplicate.id_pass)
            raise ValueError(
                f"Pengunjung dengan nama '{fullname}' sudah terdaftar dan sedang dalam antrean verifikasi resepsionis (Kartu pass #{card_no}). "
                f"Mohon tunggu konfirmasi dari petugas resepsionis."
            )

        pass_card = None
        id_pass = data.get('id_pass')
        no_pass = data.get('no_pass')

        if id_pass:
            pass_card = self.db.query(Pass).filter(Pass.id_pass == id_pass).with_for_update().first()
        elif no_pass:
            pass_card = self.db.query(Pass).filter(Pass.no_pass == str(no_pass).strip()).with_for_update().first()
        else:
            # skip_locked: dua kiosk yang mengirim bersamaan mendapat kartu berbeda, bukan saling menunggu.
            pass_card = assignable_pass_query(self.db).with_for_update(skip_locked=True).first()
            if not pass_card:
                raise ValueError("Kartu pass sedang habis. Silakan hubungi meja resepsionis.")

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
        institution_val = (data.get('institution') or '').strip() or None
        representing_val = (data.get('representing') or '').strip() or None
        purpose_val = (data.get('purpose') or '').strip() or None

        visitor = Visitor(
            id_pass=pass_card.id_pass,
            fullname=data['fullname'].strip(),
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
        self.db.flush()  # id_visitor dibutuhkan audit log agar dashboard bisa menampilkan nama tamunya

        audit = AuditLog(
            id_user=handled_by_user_id,
            action='VISITOR_REGISTER_PENDING',
            entity='visitors',
            entity_id=str(visitor.id_visitor),
            description=f"Registrasi tamu baru {visitor.fullname} dengan kartu pass #{pass_card.no_pass} menunggu konfirmasi resepsionis",
            ip_address=ip_address,
            user_agent=user_agent
        )
        self.db.add(audit)

        setting = self.db.query(Setting).first()
        if setting and setting.notify_app_checkin:
            notif = AppNotification(
                type='CHECKIN',
                title='Tamu Check-In Baru',
                message=f"{visitor.fullname} ({visitor.institution or 'Umum'}) check-in dengan kartu #{pass_card.no_pass}."
            )
            self.db.add(notif)

        self.db.commit()

        return {
            'id_visitor': visitor.id_visitor,
            'fullname': visitor.fullname,
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
