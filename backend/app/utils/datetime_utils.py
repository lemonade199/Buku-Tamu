from datetime import datetime, timezone

def utc_now() -> datetime:
    """Returns a naive UTC datetime compatible with SQLAlchemy and avoiding Python 3.12+ deprecation warnings."""
    return datetime.now(timezone.utc).replace(tzinfo=None)
