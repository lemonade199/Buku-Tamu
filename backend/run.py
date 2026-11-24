import os
import sys
import threading
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.app import create_app

app = create_app(os.getenv('FLASK_ENV', 'development'))

def start_background_backup_scheduler():
    def _worker():
        while True:
            try:
                time.sleep(300)  # check every 5 minutes
                with app.app_context():
                    from backend.app.database import get_db_session
                    from backend.app.services.backup_service import BackupService
                    db = get_db_session()
                    try:
                        service = BackupService(db)
                        service.check_and_run_auto_backup()
                    finally:
                        db.close()
            except Exception:
                pass

    t = threading.Thread(target=_worker, daemon=True)
    t.start()

if __name__ == '__main__':
    start_background_backup_scheduler()
    port = int(os.getenv('PORT', 5000))
    print(f"Backend Buku Tamu Digital berjalan di http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)
