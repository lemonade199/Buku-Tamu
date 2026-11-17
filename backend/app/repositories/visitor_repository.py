from datetime import datetime, date, time
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.models.entities import Visitor

class VisitorRepository:
    def __init__(self, db: Session):
        self.db = db

    def count_today(self) -> int:
        today_start = datetime.combine(date.today(), time.min)
        today_end = datetime.combine(date.today(), time.max)
        return self.db.query(func.count(Visitor.id_visitor)).filter(
            Visitor.check_in_at.between(today_start, today_end)
        ).scalar() or 0

    def count_active(self) -> int:
        return self.db.query(func.count(Visitor.id_visitor)).filter(
            Visitor.check_out_at.is_(None)
        ).scalar() or 0

    def count_completed_today(self) -> int:
        today_start = datetime.combine(date.today(), time.min)
        today_end = datetime.combine(date.today(), time.max)
        return self.db.query(func.count(Visitor.id_visitor)).filter(
            Visitor.check_out_at.isnot(None),
            Visitor.check_in_at.between(today_start, today_end)
        ).scalar() or 0

    def get_recent(self, limit: int = 5):
        return self.db.query(Visitor).order_by(Visitor.check_in_at.desc()).limit(limit).all()
