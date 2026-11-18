import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

from sqlalchemy import text
from backend.app.models.base import init_db

def run_migration():
    engine, _ = init_db()
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE visitors ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'APPROVED';
            ALTER TABLE visitors ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
            ALTER TABLE visitors ADD COLUMN IF NOT EXISTS approved_by_id BIGINT REFERENCES users(id_user) ON DELETE SET NULL;
            ALTER TABLE visitors ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
            ALTER TABLE visitors ADD COLUMN IF NOT EXISTS rejected_by_id BIGINT REFERENCES users(id_user) ON DELETE SET NULL;
            ALTER TABLE visitors ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP;
            CREATE INDEX IF NOT EXISTS ix_visitors_status ON visitors(status);
        """))
        conn.commit()
    print("Migration executed successfully!")

if __name__ == '__main__':
    run_migration()
