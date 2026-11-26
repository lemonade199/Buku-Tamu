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

def wib_date_start_utc(d) -> datetime:
    """Converts a calendar date in WIB (00:00:00 WIB) to naive UTC datetime."""
    start_wib = datetime(d.year, d.month, d.day, 0, 0, 0, tzinfo=WIB_TZ)
    return start_wib.astimezone(timezone.utc).replace(tzinfo=None)


def wib_date_end_utc(d) -> datetime:
    """Converts a calendar date in WIB (23:59:59.999999 WIB) to naive UTC datetime."""
    end_wib = datetime(d.year, d.month, d.day, 23, 59, 59, 999999, tzinfo=WIB_TZ)
    return end_wib.astimezone(timezone.utc).replace(tzinfo=None)


def get_today_range_utc() -> tuple[datetime, datetime]:
    """Returns the start and end of the current calendar day in WIB (Asia/Jakarta),
    converted back to UTC naive datetimes for accurate database range filtering.
    """
    today_wib = datetime.now(WIB_TZ).date()
    return wib_date_start_utc(today_wib), wib_date_end_utc(today_wib)
