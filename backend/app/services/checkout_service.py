from datetime import datetime
from sqlalchemy.orm import Session
from backend.app.models.entities import Visitor, Pass, AuditLog

class CheckoutService:
    def __init__(self, db: Session):
        self.db = db

    def process_checkout(
        self,
        id_visitor: int = None,
        no_pass: str = None,
        handled_by_user_id: int = None,
        notes: str = None,
        ip_address: str = None,
        user_agent: str = None
    ) -> dict:
        visitor = None

        if id_visitor:
            visitor = self.db.query(Visitor).filter(
                Visitor.id_visitor == id_visitor
            ).with_for_update().first()
            if not visitor:
                raise ValueError("Data pengunjung tidak ditemukan.")
            if visitor.status != 'APPROVED':
                raise ValueError(f"Tamu {visitor.fullname} belum disetujui (status: {visitor.status}) sehingga tidak dapat diproses check-out.")
            if visitor.check_out_at is not None:
                raise ValueError(f"Pengunjung {visitor.fullname} sudah check-out sebelumnya pada {visitor.check_out_at.strftime('%d/%m/%Y %H:%M')}.")
        elif no_pass:
            clean_no = str(no_pass).strip()
            pass_card = self.db.query(Pass).filter(
                Pass.no_pass == clean_no
            ).first()
            if not pass_card:
                raise ValueError(f"Kartu pass nomor {clean_no} tidak ditemukan.")

            visitor = self.db.query(Visitor).filter(
                Visitor.id_pass == pass_card.id_pass,
                Visitor.status == 'APPROVED',
                Visitor.check_out_at.is_(None)
            ).with_for_update().first()

            if not visitor:
                raise ValueError(f"Tidak ada kunjungan aktif yang menggunakan kartu pass nomor {clean_no}.")
        else:
            raise ValueError("Harap cantumkan id_visitor atau no_pass untuk memproses check-out.")

        pass_card = self.db.query(Pass).filter(
            Pass.id_pass == visitor.id_pass
        ).with_for_update().first()

        now = datetime.utcnow()

        # 1. Update Visitor checkout timestamp
        visitor.check_out_at = now
        visitor.updated_at = now

        # 2. Release Pass back to AVAILABLE status
        if pass_card:
            pass_card.status = 'AVAILABLE'
            pass_card.achieve_id = handled_by_user_id
            pass_card.achieve_at = now
            pass_card.updated_at = now

        # 3. Record Audit Log
        pass_no_str = pass_card.no_pass if pass_card else "-"
        audit = AuditLog(
            id_user=handled_by_user_id,
            action='VISITOR_CHECKOUT',
            entity='visitors',
            entity_id=str(visitor.id_visitor),
            description=f"Check-out tamu {visitor.fullname} (Pass #{pass_no_str}). Kartu pass dikembalikan ke rak.",
            ip_address=ip_address,
            user_agent=user_agent
        )
        self.db.add(audit)

        # 4. Commit atomic transaction
        self.db.commit()

        return {
            'message': f"Check-out tamu {visitor.fullname} berhasil. Kartu pass #{pass_no_str} siap digunakan kembali.",
            'visitor': visitor.to_dict(),
            'pass': pass_card.to_dict() if pass_card else None
        }
