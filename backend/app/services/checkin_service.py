import os
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import or_
from backend.app.models.entities import Visitor, Pass, AuditLog
from backend.app.utils.photo_storage import save_visitor_photo, get_photo_path

class CheckinService:
    def __init__(self, db: Session):
        self.db = db

    def process_checkin(self, data: dict, handled_by_user_id: int, ip_address: str = None, user_agent: str = None) -> dict:
        photo_base64 = data.get('photo_base64')
        if not photo_base64:
            raise ValueError("Foto pengunjung wajib diambil melalui kamera sebelum check-in.")

        # 1. Determine & Validate Pass Card
        pass_card = None
        id_pass = data.get('id_pass')
        no_pass = data.get('no_pass')

        if id_pass:
            pass_card = self.db.query(Pass).filter(Pass.id_pass == id_pass).with_for_update().first()
        elif no_pass:
            pass_card = self.db.query(Pass).filter(Pass.no_pass == str(no_pass).strip()).with_for_update().first()
        else:
            # Auto-assign next available pass
            pass_card = self.db.query(Pass).filter(Pass.status == 'AVAILABLE').order_by(Pass.no_pass.asc()).with_for_update().first()

        if not pass_card:
            raise ValueError("Kartu pass yang dipilih tidak ditemukan.")

        if pass_card.status != 'AVAILABLE':
            raise ValueError(f"Kartu pass nomor {pass_card.no_pass} sedang tidak tersedia (status: {pass_card.status}).")

        # 2. Check if this pass already has an active visit (double-check partial unique)
        active_visit = self.db.query(Visitor).filter(
            Visitor.id_pass == pass_card.id_pass,
            Visitor.check_out_at.is_(None)
        ).first()
        if active_visit:
            raise ValueError(f"Kartu pass {pass_card.no_pass} masih digunakan oleh pengunjung lain ({active_visit.fullname}).")

        # 3. Save photo securely
        photo_filename = None
        try:
            photo_filename = save_visitor_photo(photo_base64)
        except Exception as e:
            raise ValueError(f"Gagal memproses foto pengunjung: {str(e)}")

        try:
            # 4. Create Visitor Record
            now = datetime.utcnow()
            institution_val = (data.get('institution') or '').strip() or None
            representing_val = (data.get('representing') or '').strip() or None
            purpose_val = (data.get('purpose') or '').strip() or None

            visitor = Visitor(
                id_pass=pass_card.id_pass,
                fullname=data['fullname'].strip(),
                telephone=data['telephone'].strip(),
                institution=institution_val,
                representing=representing_val,
                purpose=purpose_val,
                check_in_at=now,
                capture_id=photo_filename
            )
            self.db.add(visitor)

            # 5. Update Pass Card Status
            pass_card.status = 'IN_USE'
            pass_card.handled_over_id = handled_by_user_id
            pass_card.handled_over_at = now
            pass_card.updated_at = now

            # 6. Audit Log
            audit = AuditLog(
                id_user=handled_by_user_id,
                action='VISITOR_CHECKIN',
                entity='visitors',
                description=f"Check-in tamu {visitor.fullname} dengan kartu pass #{pass_card.no_pass}",
                ip_address=ip_address,
                user_agent=user_agent
            )
            self.db.add(audit)

            # 7. Commit Transaction
            self.db.commit()

            return {
                'id_visitor': visitor.id_visitor,
                'fullname': visitor.fullname,
                'id_pass': pass_card.id_pass,
                'no_pass': pass_card.no_pass,
                'slot': pass_card.slot,
                'check_in_at': visitor.check_in_at.isoformat(),
                'capture_id': visitor.capture_id,
                'message': f"Check-in berhasil. Berikan kartu pass nomor {pass_card.no_pass} kepada tamu."
            }

        except Exception as err:
            self.db.rollback()
            # Clean up uploaded photo if database commit failed
            if photo_filename:
                file_path = get_photo_path(photo_filename)
                if os.path.exists(file_path):
                    try:
                        os.remove(file_path)
                    except OSError:
                        pass
            raise err
