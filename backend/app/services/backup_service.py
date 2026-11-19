import os
import json
from datetime import datetime, time
from sqlalchemy.orm import Session
from backend.app.models.entities import Setting, Role, User, Pass, Visitor, AuditLog

def get_backup_dir() -> str:
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    backup_dir = os.path.join(base_dir, 'storage', 'backups')
    os.makedirs(backup_dir, exist_ok=True)
    return backup_dir

def format_file_size(size_bytes: int) -> str:
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    else:
        return f"{size_bytes / (1024 * 1024):.2f} MB"

class BackupService:
    def __init__(self, db: Session):
        self.db = db
        self.backup_dir = get_backup_dir()

    def create_backup(self, user_id: int = None, ip_address: str = None) -> dict:
        now = datetime.utcnow()
        timestamp_str = now.strftime('%Y%m%d_%H%M%S')
        filename = f"bukutamu_backup_{timestamp_str}.json"
        filepath = os.path.join(self.backup_dir, filename)

        settings = self.db.query(Setting).all()
        roles = self.db.query(Role).all()
        users = self.db.query(User).all()
        passes = self.db.query(Pass).all()
        visitors = self.db.query(Visitor).all()

        backup_payload = {
            'meta': {
                'version': '1.0',
                'application': 'Buku Tamu Digital SEAMOLEC',
                'created_at': now.isoformat(),
                'created_by_user_id': user_id,
                'counts': {
                    'settings': len(settings),
                    'roles': len(roles),
                    'users': len(users),
                    'passes': len(passes),
                    'visitors': len(visitors)
                }
            },
            'data': {
                'settings': [s.to_dict() for s in settings],
                'roles': [r.to_dict() for r in roles],
                'users': [u.to_dict() for u in users],
                'passes': [p.to_dict() for p in passes],
                'visitors': [v.to_dict() for v in visitors]
            }
        }

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(backup_payload, f, indent=2, ensure_ascii=False)

        size_bytes = os.path.getsize(filepath)

        audit = AuditLog(
            id_user=user_id,
            action='DATABASE_BACKUP_CREATED',
            entity='system',
            entity_id=filename,
            description=f"Cadangan database berhasil dibuat: {filename} ({format_file_size(size_bytes)})",
            ip_address=ip_address
        )
        self.db.add(audit)
        self.db.commit()

        return {
            'filename': filename,
            'size': size_bytes,
            'size_formatted': format_file_size(size_bytes),
            'created_at': now.isoformat(),
            'counts': backup_payload['meta']['counts']
        }

    def list_backups(self) -> list:
        if not os.path.exists(self.backup_dir):
            return []

        backups = []
        for fname in os.listdir(self.backup_dir):
            if not fname.endswith('.json'):
                continue
            fpath = os.path.join(self.backup_dir, fname)
            if not os.path.isfile(fpath):
                continue

            stat = os.stat(fpath)
            created_at_dt = datetime.fromtimestamp(stat.st_mtime)
            meta_counts = None

            try:
                with open(fpath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    meta_counts = data.get('meta', {}).get('counts')
            except Exception:
                pass

            backups.append({
                'filename': fname,
                'size': stat.st_size,
                'size_formatted': format_file_size(stat.st_size),
                'created_at': created_at_dt.isoformat(),
                'counts': meta_counts or {}
            })

        backups.sort(key=lambda x: x['created_at'], reverse=True)
        return backups

    def get_backup_path(self, filename: str) -> str:
        clean_filename = os.path.basename(filename)
        fpath = os.path.join(self.backup_dir, clean_filename)
        if not os.path.exists(fpath):
            raise FileNotFoundError("File cadangan tidak ditemukan.")
        return fpath

    def delete_backup(self, filename: str, user_id: int = None, ip_address: str = None) -> bool:
        fpath = self.get_backup_path(filename)
        os.remove(fpath)

        audit = AuditLog(
            id_user=user_id,
            action='DATABASE_BACKUP_DELETED',
            entity='system',
            entity_id=filename,
            description=f"File cadangan database {filename} telah dihapus.",
            ip_address=ip_address
        )
        self.db.add(audit)
        self.db.commit()
        return True

    def restore_backup(self, backup_data: dict, user_id: int = None, ip_address: str = None) -> dict:
        meta = backup_data.get('meta', {})
        data = backup_data.get('data', {})

        if not data:
            raise ValueError("Struktur file cadangan tidak valid: bagian 'data' tidak ditemukan.")

        restored_counts = {'passes': 0, 'settings': 0}

        try:
            # 1. Restore Settings if present
            settings_data = data.get('settings', [])
            if settings_data:
                s_item = settings_data[0]
                setting = self.db.query(Setting).first()
                if not setting:
                    setting = Setting()
                    self.db.add(setting)

                for key, val in s_item.items():
                    if hasattr(setting, key) and key not in ['id_setting', 'created_at', 'updated_at']:
                        if key in ['opening_time', 'closing_time'] and isinstance(val, str):
                            try:
                                parts = val.split(':')
                                val = time(int(parts[0]), int(parts[1]))
                            except Exception:
                                continue
                        setattr(setting, key, val)
                restored_counts['settings'] = 1

            # 2. Restore Passes
            passes_data = data.get('passes', [])
            for p_dict in passes_data:
                no_pass = p_dict.get('no_pass')
                if not no_pass:
                    continue
                existing_pass = self.db.query(Pass).filter(Pass.no_pass == str(no_pass).strip()).first()
                if existing_pass:
                    existing_pass.slot = p_dict.get('slot', existing_pass.slot)
                    existing_pass.status = p_dict.get('status', 'AVAILABLE')
                else:
                    new_p = Pass(
                        no_pass=str(no_pass).strip(),
                        slot=p_dict.get('slot'),
                        status=p_dict.get('status', 'AVAILABLE')
                    )
                    self.db.add(new_p)
                restored_counts['passes'] += 1

            audit = AuditLog(
                id_user=user_id,
                action='DATABASE_RESTORE_PERFORMED',
                entity='system',
                entity_id='database_restore',
                description=f"Pemulihan database selesai dari cadangan versi {meta.get('version', '1.0')}.",
                ip_address=ip_address
            )
            self.db.add(audit)
            self.db.commit()

            return {
                'success': True,
                'message': 'Database berhasil dipulihkan dari file cadangan.',
                'restored_counts': restored_counts
            }
        except Exception as e:
            self.db.rollback()
            raise ValueError(f"Gagal memulihkan database: {str(e)}")
