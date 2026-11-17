from datetime import datetime, date, time, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.models.entities import Visitor

class VisitorRepository:
    def __init__(self, db: Session):
        self.db = db

    def count_total(self) -> int:
        return self.db.query(func.count(Visitor.id_visitor)).scalar() or 0

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

    def get_hourly_stats_today(self) -> list:
        today_start = datetime.combine(date.today(), time.min)
        today_end = datetime.combine(date.today(), time.max)
        visitors_today = self.db.query(Visitor.check_in_at).filter(
            Visitor.check_in_at.between(today_start, today_end)
        ).all()

        # Initialize standard office hours 08:00 to 17:00
        hourly_map = {f"{h:02d}:00": 0 for h in range(8, 18)}
        for (cin,) in visitors_today:
            if cin:
                hour_key = f"{cin.hour:02d}:00"
                if hour_key in hourly_map:
                    hourly_map[hour_key] += 1
                else:
                    hourly_map[hour_key] = 1

        return [{"hour": h, "count": hourly_map[h]} for h in sorted(hourly_map.keys())]

    def get_weekly_trend(self) -> list:
        days_name = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
        results = []
        today = date.today()

        for i in range(6, -1, -1):
            target_date = today - timedelta(days=i)
            start_dt = datetime.combine(target_date, time.min)
            end_dt = datetime.combine(target_date, time.max)
            count = self.db.query(func.count(Visitor.id_visitor)).filter(
                Visitor.check_in_at.between(start_dt, end_dt)
            ).scalar() or 0

            results.append({
                "date": target_date.strftime("%d/%m"),
                "day": days_name[target_date.weekday()],
                "count": count
            })

        return results
