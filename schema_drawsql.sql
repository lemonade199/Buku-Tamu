-- ==============================================================================
-- BUKU TAMU DIGITAL - DATABASE SCHEMA (FOR DRAWSQL / ERD IMPORT)
-- Dialect: PostgreSQL / MySQL / Standard SQL compatible
-- Ready to copy & paste into DrawSQL (https://drawsql.app) -> Import Schema
-- ==============================================================================

CREATE TABLE roles (
    id_role BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    permissions JSON NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id_user BIGSERIAL PRIMARY KEY,
    id_role BIGINT NOT NULL,
    fullname VARCHAR(150) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    hash_password VARCHAR(255) NOT NULL,
    telephone VARCHAR(25),
    avatar VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role FOREIGN KEY (id_role) REFERENCES roles(id_role) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE pass (
    id_pass BIGSERIAL PRIMARY KEY,
    no_pass VARCHAR(50) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    slot VARCHAR(50),
    handled_over_id BIGINT,
    handled_over_at TIMESTAMP,
    achieve_id BIGINT,
    achieve_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pass_handled_over FOREIGN KEY (handled_over_id) REFERENCES users(id_user) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_pass_achieve FOREIGN KEY (achieve_id) REFERENCES users(id_user) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE visitors (
    id_visitor BIGSERIAL PRIMARY KEY,
    id_pass BIGINT NOT NULL,
    fullname VARCHAR(150) NOT NULL,
    institution VARCHAR(150),
    representing VARCHAR(150),
    purpose TEXT,
    check_in_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    check_out_at TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    rejection_reason TEXT,
    approved_by_id BIGINT,
    approved_at TIMESTAMP,
    rejected_by_id BIGINT,
    rejected_at TIMESTAMP,
    capture_id VARCHAR(500) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_visitors_pass FOREIGN KEY (id_pass) REFERENCES pass(id_pass) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_visitors_approved_by FOREIGN KEY (approved_by_id) REFERENCES users(id_user) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_visitors_rejected_by FOREIGN KEY (rejected_by_id) REFERENCES users(id_user) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE settings (
    id_setting BIGSERIAL PRIMARY KEY,
    institution_name VARCHAR(150) NOT NULL DEFAULT 'Nama Institusi',
    logo_path VARCHAR(500),
    opening_time TIME NOT NULL DEFAULT '08:00:00',
    closing_time TIME NOT NULL DEFAULT '17:00:00',
    pass_warning_limit INTEGER NOT NULL DEFAULT 5,
    smtp_host VARCHAR(255),
    smtp_port INTEGER,
    smtp_username VARCHAR(255),
    smtp_password VARCHAR(255),
    smtp_encryption VARCHAR(10) NOT NULL DEFAULT 'tls',
    smtp_sender_name VARCHAR(150),
    smtp_sender_email VARCHAR(255),
    smtp_status VARCHAR(50) NOT NULL DEFAULT 'DISCONNECTED',
    notify_app_checkin BOOLEAN NOT NULL DEFAULT TRUE,
    notify_app_backup_fail BOOLEAN NOT NULL DEFAULT TRUE,
    notify_email_monthly_report BOOLEAN NOT NULL DEFAULT FALSE,
    notify_email_new_account BOOLEAN NOT NULL DEFAULT FALSE,
    notify_email_reset_password BOOLEAN NOT NULL DEFAULT TRUE,
    admin_notification_email VARCHAR(255),
    jwt_access_token_expiry INTEGER NOT NULL DEFAULT 900,
    jwt_refresh_token_expiry INTEGER NOT NULL DEFAULT 604800,
    sso_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    sso_issuer VARCHAR(255),
    sso_client_id VARCHAR(255),
    sso_client_secret VARCHAR(255),
    session_timeout_hours INTEGER NOT NULL DEFAULT 8,
    guest_photo_retention_months INTEGER NOT NULL DEFAULT 6,
    visit_data_retention_years INTEGER NOT NULL DEFAULT 5,
    auto_backup_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    auto_backup_schedule VARCHAR(100),
    permissions_matrix JSON,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE refresh_tokens (
    id_token BIGSERIAL PRIMARY KEY,
    id_user BIGINT NOT NULL,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (id_user) REFERENCES users(id_user) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE backup_histories (
    id_backup BIGSERIAL PRIMARY KEY,
    id_user BIGINT,
    type VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
    file_size_bytes BIGINT,
    file_path VARCHAR(500),
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_backup_histories_user FOREIGN KEY (id_user) REFERENCES users(id_user) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE audit_logs (
    id_log BIGSERIAL PRIMARY KEY,
    id_user BIGINT,
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    description TEXT,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_logs_user FOREIGN KEY (id_user) REFERENCES users(id_user) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE app_notifications (
    id_notification BIGSERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
