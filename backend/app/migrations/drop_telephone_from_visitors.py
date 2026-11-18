import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

from sqlalchemy import text
from backend.app.models.base import init_db

def run_migration():
    engine, _ = init_db()
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE visitors DROP COLUMN IF EXISTS telephone;"))
        conn.commit()
    print("Column telephone successfully dropped from visitors table.")

if __name__ == '__main__':
    run_migration()
