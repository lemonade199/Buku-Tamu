from datetime import datetime, date, time, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.models.entities import Visitor

class VisitorRepository:
    def __init__(self, db: Session):
        self.db = db

    def count_total(self) -> int:
        return self.db.query(func.count(Visitor.id_visitor)).filter(Visitor.status == 'APPROVED').scalar() or 0

    def count_today(self) -> int:
        today_start = datetime.combine(date.today(), time.min)
        today_end = datetime.combine(date.today(), time.max)
        return self.db.query(func.count(Visitor.id_visitor)).filter(
            Visitor.status == 'APPROVED',
            Visitor.check_in_at.between(today_start, today_end)
        ).scalar() or 0

    def count_active(self) -> int:
        return self.db.query(func.count(Visitor.id_visitor)).filter(
            Visitor.status == 'APPROVED',
            Visitor.check_out_at.is_(None)
        ).scalar() or 0

    def count_pending(self) -> int:
        return self.db.query(func.count(Visitor.id_visitor)).filter(
            Visitor.status == 'PENDING'
        ).scalar() or 0

    def get_pending(self) -> list:
        return self.db.query(Visitor).filter(
            Visitor.status == 'PENDING'
        ).order_by(Visitor.check_in_at.asc()).all()

    def count_completed_today(self) -> int:
        today_start = datetime.combine(date.today(), time.min)
        today_end = datetime.combine(date.today(), time.max)
        return self.db.query(func.count(Visitor.id_visitor)).filter(
            Visitor.status == 'APPROVED',
            Visitor.check_out_at.isnot(None),
            Visitor.check_in_at.between(today_start, today_end)
        ).scalar() or 0

    def get_recent(self, limit: int = 5):
        return self.db.query(Visitor).filter(
            Visitor.status == 'APPROVED'
        ).order_by(Visitor.check_in_at.desc()).limit(limit).all()

    def get_hourly_stats_today(self) -> list:
        today_start = datetime.combine(date.today(), time.min)
        today_end = datetime.combine(date.today(), time.max)
        visitors_today = self.db.query(Visitor.check_in_at).filter(
            Visitor.status == 'APPROVED',
            Visitor.check_in_at.between(today_start, today_end)
        ).all()

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
                Visitor.status == 'APPROVED',
                Visitor.check_in_at.between(start_dt, end_dt)
            ).scalar() or 0

            results.append({
                "date": target_date.strftime("%d/%m"),
                "day": days_name[target_date.weekday()],
                "count": count
            })

        return results

    def count_this_month(self) -> int:
        now = datetime.utcnow()
        month_start = datetime(now.year, now.month, 1)
        return self.db.query(func.count(Visitor.id_visitor)).filter(
            Visitor.status == 'APPROVED',
            Visitor.check_in_at >= month_start
        ).scalar() or 0

    def get_monthly_stats(self) -> list:
        now = datetime.utcnow()
        year = now.year
        months_label = ['Jan', 'Feb', 'Mart', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
        result = []
        for m in range(1, 13):
            start_m = datetime(year, m, 1)
            if m == 12:
                end_m = datetime(year + 1, 1, 1)
            else:
                end_m = datetime(year, m + 1, 1)

            count = self.db.query(func.count(Visitor.id_visitor)).filter(
                Visitor.status == 'APPROVED',
                Visitor.check_in_at >= start_m,
                Visitor.check_in_at < end_m
            ).scalar() or 0

            result.append({
                "month": months_label[m - 1],
                "count": count
            })
        return result

    def get_top_institutions(self, limit: int = 5) -> list:
        rows = self.db.query(
            Visitor.institution,
            func.count(Visitor.id_visitor).label('total')
        ).filter(
            Visitor.status == 'APPROVED',
            Visitor.institution.isnot(None),
            Visitor.institution != ''
        ).group_by(Visitor.institution).order_by(func.count(Visitor.id_visitor).desc()).limit(limit).all()

        return [{"name": r[0], "count": r[1]} for r in rows]

    def get_recent_activities(self, limit: int = 8) -> list:
        from backend.app.models.entities import AuditLog
        logs = self.db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
        days_id = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
        result = []
        for l in logs:
            dt = l.created_at
            day_name = days_id[dt.weekday()]
            result.append({
                "id": l.id_log,
                "date": f"{day_name}, {dt.strftime('%d/%m/%Y')}",
                "time": dt.strftime('%H.%M'),
                "description": l.description or l.action
            })
        return result
