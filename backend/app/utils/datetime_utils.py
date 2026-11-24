from datetime import datetime, timezone, timedelta

WIB_TZ = timezone(timedelta(hours=7))

def utc_now() -> datetime:
    """Returns a naive UTC datetime compatible with SQLAlchemy and avoiding Python 3.12+ deprecation warnings."""
    return datetime.now(timezone.utc).replace(tzinfo=None)

def to_wib(dt: datetime | None) -> datetime | None:
    """Converts a naive or aware UTC datetime to naive WIB datetime (Asia/Jakarta, UTC+7)."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(WIB_TZ).replace(tzinfo=None)

def get_today_range_utc() -> tuple[datetime, datetime]:
    """Returns the start and end of the current calendar day in WIB (Asia/Jakarta),
    converted back to UTC naive datetimes for accurate database range filtering.
    """
    now_wib = datetime.now(WIB_TZ)
    start_wib = datetime(now_wib.year, now_wib.month, now_wib.day, 0, 0, 0, tzinfo=WIB_TZ)
    end_wib = datetime(now_wib.year, now_wib.month, now_wib.day, 23, 59, 59, 999999, tzinfo=WIB_TZ)
    
    start_utc = start_wib.astimezone(timezone.utc).replace(tzinfo=None)
    end_utc = end_wib.astimezone(timezone.utc).replace(tzinfo=None)
    return start_utc, end_utc
