import os
import json
from datetime import datetime, time, timedelta
from sqlalchemy.orm import Session
from backend.app.models.entities import (
    Setting, Role, User, Pass, Visitor, AuditLog, BackupHistory, AppNotification
)
from backend.app.utils.datetime_utils import utc_now
from backend.app.utils.photo_storage import get_photo_path

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

    def create_backup(self, user_id: int = None, ip_address: str = None, backup_type: str = 'MANUAL') -> dict:
        now = utc_now()
        timestamp_str = now.strftime('%Y%m%d_%H%M%S')
        prefix = "bukutamu_backup_auto" if backup_type == 'AUTO' else "bukutamu_backup"
        filename = f"{prefix}_{timestamp_str}.json"
        filepath = os.path.join(self.backup_dir, filename)

        try:
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
                    'backup_type': backup_type,
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

            history = BackupHistory(
                id_user=user_id,
                type=backup_type,
                status='SUCCESS',
                file_size_bytes=size_bytes,
                file_path=filepath,
                created_at=now
            )
            self.db.add(history)

            audit = AuditLog(
                id_user=user_id,
                action='DATABASE_BACKUP_CREATED',
                entity='system',
                entity_id=filename,
                description=f"Cadangan database ({backup_type}) berhasil dibuat: {filename} ({format_file_size(size_bytes)})",
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
        except Exception as e:
            self.db.rollback()
            try:
                fail_history = BackupHistory(
                    id_user=user_id,
                    type=backup_type,
                    status='FAILED',
                    error_message=str(e),
                    created_at=now
                )
                self.db.add(fail_history)

                setting = self.db.query(Setting).first()
                if setting and setting.notify_app_backup_fail:
                    notif = AppNotification(
                        type='BACKUP_FAILED',
                        title='Gagal Membuat Cadangan Database',
                        message=f'Pembuatan salinan database {backup_type} gagal: {str(e)}',
                        is_read=False
                    )
                    self.db.add(notif)
                self.db.commit()
            except Exception:
                self.db.rollback()
            raise

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

        restored_counts = {'settings': 0, 'passes': 0, 'users': 0, 'visitors': 0}

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

            # 3. Restore Users if present
            users_data = data.get('users', [])
            for u_dict in users_data:
                uname = u_dict.get('username')
                if not uname:
                    continue
                existing_user = self.db.query(User).filter(User.username == uname).first()
                if not existing_user:
                    new_u = User(
                        username=uname,
                        fullname=u_dict.get('fullname', uname),
                        email=u_dict.get('email'),
                        phone_number=u_dict.get('phone_number'),
                        password_hash=u_dict.get('password_hash', ''),
                        id_role=u_dict.get('id_role', 1),
                        status=u_dict.get('status', 'ACTIVE')
                    )
                    self.db.add(new_u)
                    restored_counts['users'] += 1

            # 4. Restore Visitors if present
            visitors_data = data.get('visitors', [])
            for v_dict in visitors_data:
                fname = v_dict.get('fullname')
                if not fname:
                    continue

                # Match pass
                pass_no = v_dict.get('no_pass')
                pass_card = None
                if pass_no:
                    pass_card = self.db.query(Pass).filter(Pass.no_pass == str(pass_no).strip()).first()
                if not pass_card and v_dict.get('id_pass'):
                    pass_card = self.db.query(Pass).filter(Pass.id_pass == v_dict['id_pass']).first()
                if not pass_card:
                    pass_card = self.db.query(Pass).first()
                if not pass_card:
                    continue

                check_in_dt = None
                if v_dict.get('check_in_at'):
                    try:
                        clean_dt = v_dict['check_in_at'].replace('Z', '+00:00')
                        check_in_dt = datetime.fromisoformat(clean_dt).replace(tzinfo=None)
                    except Exception:
                        check_in_dt = utc_now()
                else:
                    check_in_dt = utc_now()

                check_out_dt = None
                if v_dict.get('check_out_at'):
                    try:
                        clean_out = v_dict['check_out_at'].replace('Z', '+00:00')
                        check_out_dt = datetime.fromisoformat(clean_out).replace(tzinfo=None)
                    except Exception:
                        pass

                existing_v = None
                if v_dict.get('id_visitor'):
                    existing_v = self.db.query(Visitor).filter(Visitor.id_visitor == v_dict['id_visitor']).first()
                if not existing_v and check_in_dt:
                    existing_v = self.db.query(Visitor).filter(
                        Visitor.fullname == fname,
                        Visitor.check_in_at == check_in_dt
                    ).first()

                if existing_v:
                    existing_v.id_pass = pass_card.id_pass
                    existing_v.institution = v_dict.get('institution', existing_v.institution)
                    existing_v.representing = v_dict.get('representing', existing_v.representing)
                    existing_v.purpose = v_dict.get('purpose', existing_v.purpose)
                    existing_v.status = v_dict.get('status', existing_v.status)
                    existing_v.check_out_at = check_out_dt
                    existing_v.capture_id = v_dict.get('capture_id', existing_v.capture_id)
                else:
                    new_v = Visitor(
                        id_pass=pass_card.id_pass,
                        fullname=fname,
                        institution=v_dict.get('institution'),
                        representing=v_dict.get('representing'),
                        purpose=v_dict.get('purpose'),
                        status=v_dict.get('status', 'PENDING'),
                        check_in_at=check_in_dt,
                        check_out_at=check_out_dt,
                        capture_id=v_dict.get('capture_id', 'photo_placeholder.jpg')
                    )
                    self.db.add(new_v)
                restored_counts['visitors'] += 1

            audit = AuditLog(
                id_user=user_id,
                action='DATABASE_RESTORE_PERFORMED',
                entity='system',
                entity_id='database_restore',
                description=(
                    f"Pemulihan database selesai dari cadangan versi {meta.get('version', '1.0')} "
                    f"({restored_counts['passes']} kartu pass, {restored_counts['visitors']} tamu, "
                    f"{restored_counts['users']} pengguna)."
                ),
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

    def execute_retention_cleanup(self, user_id: int = None, ip_address: str = None,
                                  guest_photo_months: int = None, visit_data_years: int = None) -> dict:
        setting = self.db.query(Setting).first()
        if guest_photo_months is None and setting:
            guest_photo_months = setting.guest_photo_retention_months
        if visit_data_years is None and setting:
            visit_data_years = setting.visit_data_retention_years

        guest_photo_months = int(guest_photo_months or 6)
        visit_data_years = int(visit_data_years or 5)

        now = utc_now()
        photos_cleaned = 0
        visits_purged = 0

        # 1. Clean expired guest photos
        if guest_photo_months > 0:
            photo_cutoff = now - timedelta(days=guest_photo_months * 30)
            expired_visitors = self.db.query(Visitor).filter(
                Visitor.check_in_at < photo_cutoff,
                Visitor.capture_id.isnot(None),
                Visitor.capture_id != '',
                Visitor.capture_id != 'CLEANED'
            ).all()

            for v in expired_visitors:
                try:
                    p_path = get_photo_path(v.capture_id)
                    if os.path.exists(p_path) and os.path.isfile(p_path):
                        os.remove(p_path)
                except Exception:
                    pass
                v.capture_id = 'CLEANED'
                photos_cleaned += 1

        # 2. Clean expired visit records
        if visit_data_years > 0:
            visit_cutoff = now - timedelta(days=visit_data_years * 365)
            expired_visits = self.db.query(Visitor).filter(
                Visitor.check_in_at < visit_cutoff,
                Visitor.status.in_(['CHECKED_OUT', 'REJECTED'])
            ).all()

            visits_purged = len(expired_visits)
            for v in expired_visits:
                self.db.delete(v)

        audit = AuditLog(
            id_user=user_id,
            action='DATA_RETENTION_CLEANUP_PERFORMED',
            entity='system',
            entity_id='retention_policy',
            description=(
                f"Pembersihan retensi data: {photos_cleaned} file foto tamu dibersihkan "
                f"(retensi > {guest_photo_months} bulan), {visits_purged} data kunjungan kedaluwarsa "
                f"dihapus (retensi > {visit_data_years} tahun)."
            ),
            ip_address=ip_address
        )
        self.db.add(audit)
        self.db.commit()

        return {
            'photos_cleaned': photos_cleaned,
            'visits_purged': visits_purged,
            'guest_photo_retention_months': guest_photo_months,
            'visit_data_retention_years': visit_data_years,
            'executed_at': now.isoformat()
        }

    def check_and_run_auto_backup(self) -> bool:
        """
        Executed periodically by background daemon.
        Checks if auto backup is enabled in settings and hasn't run yet today.
        """
        setting = self.db.query(Setting).first()
        if not setting or not setting.auto_backup_enabled:
            return False

        now = utc_now()
        today_start = datetime(now.year, now.month, now.day)

        existing_auto = self.db.query(BackupHistory).filter(
            BackupHistory.type == 'AUTO',
            BackupHistory.status == 'SUCCESS',
            BackupHistory.created_at >= today_start
        ).first()

        if existing_auto:
            return False

        try:
            self.create_backup(user_id=None, backup_type='AUTO')
            return True
        except Exception:
            return False
