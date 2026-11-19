from datetime import datetime, time
import json
from sqlalchemy import (
    Column, BigInteger, Integer, String, Text, Boolean, 
    DateTime, Time, ForeignKey, Index, CheckConstraint
)
from sqlalchemy.types import JSON
from sqlalchemy.orm import relationship
from backend.app.models.base import Base

class Role(Base):
    __tablename__ = 'roles'

    id_role = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    code = Column(String(50), nullable=False, unique=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    permissions = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    users = relationship('User', back_populates='role')

    def to_dict(self):
        return {
            'id_role': self.id_role,
            'code': self.code,
            'name': self.name,
            'description': self.description,
            'is_active': self.is_active,
            'permissions': self.permissions if isinstance(self.permissions, list) else json.loads(self.permissions or '[]'),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

class User(Base):
    __tablename__ = 'users'

    id_user = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    id_role = Column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey('roles.id_role', onupdate='CASCADE', ondelete='RESTRICT'), nullable=False, index=True)
    fullname = Column(String(150), nullable=False)
    username = Column(String(50), nullable=False, unique=True, index=True)
    email = Column(String(150), nullable=False, unique=True, index=True)
    hash_password = Column(String(255), nullable=False)
    telephone = Column(String(25), nullable=True)
    avatar = Column(String(255), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    last_login_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    role = relationship('Role', back_populates='users')
    refresh_tokens = relationship('RefreshToken', back_populates='user', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id_user': self.id_user,
            'id_role': self.id_role,
            'role_code': self.role.code if self.role else None,
            'role_name': self.role.name if self.role else None,
            'fullname': self.fullname,
            'username': self.username,
            'email': self.email,
            'telephone': self.telephone,
            'avatar': self.avatar,
            'is_active': self.is_active,
            'last_login_at': self.last_login_at.isoformat() if self.last_login_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

class Pass(Base):
    __tablename__ = 'pass'

    id_pass = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    no_pass = Column(String(50), nullable=False, unique=True, index=True)
    status = Column(String(20), nullable=False, default='AVAILABLE', index=True)
    slot = Column(String(50), nullable=True)
    handled_over_id = Column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey('users.id_user', onupdate='CASCADE', ondelete='SET NULL'), nullable=True)
    handled_over_at = Column(DateTime, nullable=True)
    achieve_id = Column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey('users.id_user', onupdate='CASCADE', ondelete='SET NULL'), nullable=True)
    achieve_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    visitors = relationship('Visitor', back_populates='pass_card')

    def to_dict(self):
        return {
            'id_pass': self.id_pass,
            'no_pass': self.no_pass,
            'status': self.status,
            'slot': self.slot,
            'handled_over_id': self.handled_over_id,
            'handled_over_at': self.handled_over_at.isoformat() if self.handled_over_at else None,
            'achieve_id': self.achieve_id,
            'achieve_at': self.achieve_at.isoformat() if self.achieve_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

class Visitor(Base):
    __tablename__ = 'visitors'

    id_visitor = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    id_pass = Column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey('pass.id_pass', onupdate='CASCADE', ondelete='RESTRICT'), nullable=False, index=True)
    fullname = Column(String(150), nullable=False, index=True)
    telephone = Column(String(25), nullable=True)
    institution = Column(String(150), nullable=True)
    representing = Column(String(150), nullable=True)
    purpose = Column(Text, nullable=True)
    check_in_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    check_out_at = Column(DateTime, nullable=True, index=True)
    status = Column(String(20), nullable=False, default='PENDING', index=True)
    rejection_reason = Column(Text, nullable=True)
    approved_by_id = Column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey('users.id_user', onupdate='CASCADE', ondelete='SET NULL'), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    rejected_by_id = Column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey('users.id_user', onupdate='CASCADE', ondelete='SET NULL'), nullable=True)
    rejected_at = Column(DateTime, nullable=True)
    capture_id = Column(String(500), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    pass_card = relationship('Pass', back_populates='visitors')
    approved_by = relationship('User', foreign_keys=[approved_by_id])
    rejected_by = relationship('User', foreign_keys=[rejected_by_id])

    def to_dict(self):
        return {
            'id_visitor': self.id_visitor,
            'id_pass': self.id_pass,
            'no_pass': self.pass_card.no_pass if self.pass_card else None,
            'fullname': self.fullname,
            'telephone': self.telephone,
            'institution': self.institution,
            'representing': self.representing,
            'purpose': self.purpose,
            'status': self.status,
            'rejection_reason': self.rejection_reason,
            'approved_by': self.approved_by.fullname if self.approved_by else None,
            'approved_at': self.approved_at.isoformat() if self.approved_at else None,
            'rejected_by': self.rejected_by.fullname if self.rejected_by else None,
            'rejected_at': self.rejected_at.isoformat() if self.rejected_at else None,
            'check_in_at': self.check_in_at.isoformat() if self.check_in_at else None,
            'check_out_at': self.check_out_at.isoformat() if self.check_out_at else None,
            'capture_id': self.capture_id,
            'is_active': self.status == 'APPROVED' and self.check_out_at is None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

class Setting(Base):
    __tablename__ = 'settings'

    id_setting = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    institution_name = Column(String(150), nullable=False, default='Nama Institusi')
    logo_path = Column(String(500), nullable=True)
    opening_time = Column(Time, nullable=False, default=time(8, 0))
    closing_time = Column(Time, nullable=False, default=time(17, 0))
    pass_warning_limit = Column(Integer, nullable=False, default=5)
    smtp_host = Column(String(255), nullable=True)
    smtp_port = Column(Integer, nullable=True)
    smtp_username = Column(String(255), nullable=True)
    smtp_encryption = Column(String(10), nullable=False, default='tls')
    smtp_sender_name = Column(String(150), nullable=True)
    smtp_sender_email = Column(String(255), nullable=True)
    notify_app_checkin = Column(Boolean, nullable=False, default=True)
    notify_app_backup_fail = Column(Boolean, nullable=False, default=True)
    notify_email_monthly_report = Column(Boolean, nullable=False, default=False)
    notify_email_new_account = Column(Boolean, nullable=False, default=False)
    notify_email_reset_password = Column(Boolean, nullable=False, default=True)
    admin_notification_email = Column(String(255), nullable=True)
    jwt_access_token_expiry = Column(Integer, nullable=False, default=900)
    jwt_refresh_token_expiry = Column(Integer, nullable=False, default=604800)
    sso_enabled = Column(Boolean, nullable=False, default=False)
    sso_issuer = Column(String(255), nullable=True)
    sso_client_id = Column(String(255), nullable=True)
    sso_client_secret = Column(String(255), nullable=True)
    session_timeout_hours = Column(Integer, nullable=False, default=8)
    guest_photo_retention_months = Column(Integer, nullable=False, default=6)
    visit_data_retention_years = Column(Integer, nullable=False, default=5)
    auto_backup_enabled = Column(Boolean, nullable=False, default=False)
    auto_backup_schedule = Column(String(100), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id_setting': self.id_setting,
            'institution_name': self.institution_name,
            'logo_path': self.logo_path,
            'opening_time': self.opening_time.strftime('%H:%M') if self.opening_time else '07:30',
            'closing_time': self.closing_time.strftime('%H:%M') if self.closing_time else '16:00',
            'pass_warning_limit': self.pass_warning_limit,
            'smtp_host': self.smtp_host,
            'smtp_port': self.smtp_port,
            'smtp_username': self.smtp_username,
            'smtp_encryption': self.smtp_encryption,
            'smtp_sender_name': self.smtp_sender_name,
            'smtp_sender_email': self.smtp_sender_email,
            'notify_app_checkin': self.notify_app_checkin,
            'notify_app_backup_fail': self.notify_app_backup_fail,
            'notify_email_monthly_report': self.notify_email_monthly_report,
            'notify_email_new_account': self.notify_email_new_account,
            'notify_email_reset_password': self.notify_email_reset_password,
            'admin_notification_email': self.admin_notification_email,
            'jwt_access_token_expiry': self.jwt_access_token_expiry,
            'jwt_refresh_token_expiry': self.jwt_refresh_token_expiry,
            'sso_enabled': self.sso_enabled,
            'sso_issuer': self.sso_issuer,
            'sso_client_id': self.sso_client_id,
            'sso_client_secret': self.sso_client_secret,
            'session_timeout_hours': self.session_timeout_hours,
            'guest_photo_retention_months': self.guest_photo_retention_months,
            'visit_data_retention_years': self.visit_data_retention_years,
            'auto_backup_enabled': self.auto_backup_enabled,
            'auto_backup_schedule': self.auto_backup_schedule,
        }

class RefreshToken(Base):
    __tablename__ = 'refresh_tokens'

    id_token = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    id_user = Column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey('users.id_user', onupdate='CASCADE', ondelete='CASCADE'), nullable=False, index=True)
    token_hash = Column(String(255), nullable=False, unique=True, index=True)
    expires_at = Column(DateTime, nullable=False, index=True)
    revoked_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    user = relationship('User', back_populates='refresh_tokens')

class BackupHistory(Base):
    __tablename__ = 'backup_histories'

    id_backup = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    id_user = Column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey('users.id_user', onupdate='CASCADE', ondelete='SET NULL'), nullable=True)
    type = Column(String(20), nullable=False, default='MANUAL')
    status = Column(String(20), nullable=False, default='IN_PROGRESS')
    file_size_bytes = Column(BigInteger().with_variant(Integer, "sqlite"), nullable=True)
    file_path = Column(String(500), nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

class AuditLog(Base):
    __tablename__ = 'audit_logs'

    id_log = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    id_user = Column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey('users.id_user', onupdate='CASCADE', ondelete='SET NULL'), nullable=True, index=True)
    action = Column(String(100), nullable=False)
    entity = Column(String(100), nullable=False)
    entity_id = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

    user = relationship('User')
