from datetime import datetime, date, time, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.models.entities import Visitor
from backend.app.utils.datetime_utils import utc_now, to_wib, get_today_range_utc, WIB_TZ

class VisitorRepository:
    def __init__(self, db: Session):
        self.db = db

    def count_total(self) -> int:
        return self.db.query(func.count(Visitor.id_visitor)).filter(Visitor.status == 'APPROVED').scalar() or 0

    def count_today(self) -> int:
        today_start_utc, today_end_utc = get_today_range_utc()
        return self.db.query(func.count(Visitor.id_visitor)).filter(
            Visitor.status == 'APPROVED',
            Visitor.check_in_at.between(today_start_utc, today_end_utc)
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
        today_start_utc, today_end_utc = get_today_range_utc()
        return self.db.query(func.count(Visitor.id_visitor)).filter(
            Visitor.status == 'APPROVED',
            Visitor.check_out_at.isnot(None),
            Visitor.check_in_at.between(today_start_utc, today_end_utc)
        ).scalar() or 0

    def get_recent(self, limit: int = 5):
        return self.db.query(Visitor).filter(
            Visitor.status == 'APPROVED'
        ).order_by(Visitor.check_in_at.desc()).limit(limit).all()

    def get_hourly_stats_today(self) -> list:
        today_start_utc, today_end_utc = get_today_range_utc()
        visitors_today = self.db.query(Visitor.check_in_at).filter(
            Visitor.status == 'APPROVED',
            Visitor.check_in_at.between(today_start_utc, today_end_utc)
        ).all()

        hourly_map = {f"{h:02d}:00": 0 for h in range(8, 18)}
        for (cin,) in visitors_today:
            if cin:
                cin_wib = to_wib(cin)
                hour_key = f"{cin_wib.hour:02d}:00"
                if hour_key in hourly_map:
                    hourly_map[hour_key] += 1
                else:
                    hourly_map[hour_key] = 1

        return [{"hour": h, "count": hourly_map[h]} for h in sorted(hourly_map.keys())]

    def get_weekly_trend(self) -> list:
        days_name = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
        results = []
        now_wib = datetime.now(WIB_TZ)
        today_wib = now_wib.date()

        for i in range(6, -1, -1):
            target_date = today_wib - timedelta(days=i)
            start_wib = datetime(target_date.year, target_date.month, target_date.day, 0, 0, 0, tzinfo=WIB_TZ)
            end_wib = datetime(target_date.year, target_date.month, target_date.day, 23, 59, 59, 999999, tzinfo=WIB_TZ)
            start_utc = start_wib.astimezone(timezone.utc).replace(tzinfo=None)
            end_utc = end_wib.astimezone(timezone.utc).replace(tzinfo=None)

            count = self.db.query(func.count(Visitor.id_visitor)).filter(
                Visitor.status == 'APPROVED',
                Visitor.check_in_at.between(start_utc, end_utc)
            ).scalar() or 0

            results.append({
                "date": target_date.strftime("%d/%m"),
                "day": days_name[target_date.weekday()],
                "count": count
            })

        return results

    def count_this_month(self) -> int:
        now_wib = datetime.now(WIB_TZ)
        month_start_wib = datetime(now_wib.year, now_wib.month, 1, 0, 0, 0, tzinfo=WIB_TZ)
        month_start_utc = month_start_wib.astimezone(timezone.utc).replace(tzinfo=None)
        return self.db.query(func.count(Visitor.id_visitor)).filter(
            Visitor.status == 'APPROVED',
            Visitor.check_in_at >= month_start_utc
        ).scalar() or 0

    def get_monthly_stats(self) -> list:
        now_wib = datetime.now(WIB_TZ)
        year = now_wib.year
        months_label = ['Jan', 'Feb', 'Mart', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
        result = []
        for m in range(1, 13):
            start_wib = datetime(year, m, 1, 0, 0, 0, tzinfo=WIB_TZ)
            if m == 12:
                end_wib = datetime(year + 1, 1, 1, 0, 0, 0, tzinfo=WIB_TZ)
            else:
                end_wib = datetime(year, m + 1, 1, 0, 0, 0, tzinfo=WIB_TZ)

            start_utc = start_wib.astimezone(timezone.utc).replace(tzinfo=None)
            end_utc = end_wib.astimezone(timezone.utc).replace(tzinfo=None)

            count = self.db.query(func.count(Visitor.id_visitor)).filter(
                Visitor.status == 'APPROVED',
                Visitor.check_in_at >= start_utc,
                Visitor.check_in_at < end_utc
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
        """Aktivitas terbaru dengan data terstruktur (pelaku, tamu, kartu) agar dashboard bisa menyusun kalimat sendiri."""
        import re
        from backend.app.models.entities import AuditLog, Pass

        # Ambil lebih banyak dari limit karena sebagian log kartu adalah pasangan dari log tamu dan akan dilewati.
        logs = self.db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit * 3).all()

        visitor_ids = {int(l.entity_id) for l in logs if l.entity == 'visitors' and (l.entity_id or '').isdigit()}
        pass_ids = {int(l.entity_id) for l in logs if l.entity == 'pass' and (l.entity_id or '').isdigit()}
        visitors = {v.id_visitor: v for v in self.db.query(Visitor).filter(Visitor.id_visitor.in_(visitor_ids)).all()} if visitor_ids else {}
        passes = {p.id_pass: p for p in self.db.query(Pass).filter(Pass.id_pass.in_(pass_ids)).all()} if pass_ids else {}

        # Menyetujui/menolak dari Monitoring Pass menulis dua log sekaligus (tamu + kartu); cukup tampilkan log tamunya.
        visitor_log_moments = [(l.id_user, l.created_at) for l in logs if l.entity == 'visitors']

        def is_pair_of_visitor_log(log) -> bool:
            return any(
                uid == log.id_user and abs((ts - log.created_at).total_seconds()) <= 3
                for uid, ts in visitor_log_moments
            )

        days_id = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
        result = []
        for l in logs:
            if l.action == 'PASS_STATUS_CHANGE' and is_pair_of_visitor_log(l):
                continue

            desc = l.description or ''
            visitor_name = None
            no_pass = None
            from_status = None
            to_status = None

            if l.entity == 'visitors':
                v = visitors.get(int(l.entity_id)) if (l.entity_id or '').isdigit() else None
                if v:
                    visitor_name = v.fullname
                    no_pass = v.pass_card.no_pass if v.pass_card else None
                else:
                    # Log pendaftaran lama tidak menyimpan id tamu; ambil dari kalimatnya.
                    m = re.search(r"tamu (?:baru )?(.+?)(?: dengan kartu| disetujui| ditolak| \(Pass|\.|$)", desc)
                    visitor_name = m.group(1).strip() if m else None
            elif l.entity == 'pass':
                p = passes.get(int(l.entity_id)) if (l.entity_id or '').isdigit() else None
                no_pass = p.no_pass if p else None
                m = re.search(r"dari (\w+) menjadi (\w+)", desc)
                if m:
                    from_status, to_status = m.group(1), m.group(2)

            if no_pass is None:
                m = re.search(r"#(\w+)", desc)
                no_pass = m.group(1) if m else None

            dt = to_wib(l.created_at)
            result.append({
                "id": l.id_log,
                "date": f"{days_id[dt.weekday()]}, {dt.strftime('%d/%m/%Y')}",
                "time": dt.strftime('%H.%M'),
                "action": l.action,
                "actor": l.user.fullname if l.user else None,
                "visitor_name": visitor_name,
                "no_pass": no_pass,
                "from_status": from_status,
                "to_status": to_status,
                "description": desc or l.action,
            })
            if len(result) >= limit:
                break
        return result
