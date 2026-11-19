from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.models.entities import Pass, Visitor

class PassRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self):
        return self.db.query(Pass).order_by(Pass.no_pass.asc()).all()

    def get_by_no_pass(self, no_pass: str) -> Pass | None:
        return self.db.query(Pass).filter(Pass.no_pass == no_pass).first()

    def get_available(self):
        return self.db.query(Pass).filter(Pass.status == 'AVAILABLE').order_by(Pass.no_pass.asc()).all()

    def count_total(self) -> int:
        return self.db.query(func.count(Pass.id_pass)).scalar() or 0

    def count_active(self) -> int:
        return self.db.query(func.count(Pass.id_pass)).filter(Pass.status != 'INACTIVE').scalar() or 0

    def count_by_status(self):
        results = self.db.query(Pass.status, func.count(Pass.id_pass)).group_by(Pass.status).all()
        counts = {'AVAILABLE': 0, 'IN_USE': 0, 'PENDING': 0, 'MAINTENANCE': 0, 'LOST': 0, 'INACTIVE': 0}
        for status, count in results:
            counts[status] = count
        return counts
