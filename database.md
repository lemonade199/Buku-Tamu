
-- =====================================================
-- DATABASE BUKU TAMU DIGITAL
-- PostgreSQL 15+
-- =====================================================

CREATE DATABASE buku_tamu
    WITH ENCODING = 'UTF8';

-- Jalankan bagian berikut setelah terhubung ke database buku_tamu.

-- =====================================================
-- 1. ROLES
-- =====================================================

CREATE TABLE roles (
    id_role BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_roles_permissions
        CHECK (jsonb_typeof(permissions) = 'array')
);

-- =====================================================
-- 2. USERS
-- =====================================================

CREATE TABLE users (
    id_user BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_role BIGINT NOT NULL,
    fullname VARCHAR(150) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    hash_password VARCHAR(255) NOT NULL,
    telephone VARCHAR(25),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_users_role
        FOREIGN KEY (id_role)
        REFERENCES roles(id_role)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE INDEX idx_users_role ON users(id_role);
CREATE INDEX idx_users_active ON users(is_active);

-- =====================================================
-- 3. PASS
-- =====================================================

CREATE TABLE pass (
    id_pass BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    no_pass VARCHAR(50) NOT NULL UNIQUE,

    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    slot VARCHAR(50),

    handled_over_id BIGINT,
    handled_over_at TIMESTAMP,

    achieve_id BIGINT,
    achieve_at TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_pass_status CHECK (
        status IN (
            'AVAILABLE',
            'IN_USE',
            'MAINTENANCE',
            'LOST',
            'INACTIVE'
        )
    ),

    CONSTRAINT fk_pass_handled_over
        FOREIGN KEY (handled_over_id)
        REFERENCES users(id_user)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_pass_achieve
        FOREIGN KEY (achieve_id)
        REFERENCES users(id_user)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

CREATE INDEX idx_pass_status ON pass(status);

-- =====================================================
-- 4. VISITORS
-- Satu baris = satu riwayat kunjungan.
-- Foto wajib.
-- =====================================================

CREATE TABLE visitors (
    id_visitor BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_pass BIGINT NOT NULL,

    fullname VARCHAR(150) NOT NULL,
    institution VARCHAR(150),
    representing VARCHAR(150),
    purpose TEXT,

    check_in_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    check_out_at TIMESTAMP,

    capture_id VARCHAR(500) NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_visitors_pass
        FOREIGN KEY (id_pass)
        REFERENCES pass(id_pass)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_visitors_checkout
        CHECK (
            check_out_at IS NULL
            OR check_out_at >= check_in_at
        )
);

-- Satu pass hanya boleh memiliki satu kunjungan aktif.
-- Pass dapat digunakan kembali setelah check-out.

CREATE UNIQUE INDEX uq_visitors_active_pass
    ON visitors(id_pass)
    WHERE check_out_at IS NULL;

CREATE INDEX idx_visitors_fullname
    ON visitors(fullname);

CREATE INDEX idx_visitors_telephone
    ON visitors(telephone);

CREATE INDEX idx_visitors_checkin
    ON visitors(check_in_at);

CREATE INDEX idx_visitors_checkout
    ON visitors(check_out_at);

-- =====================================================
-- 5. SETTINGS
-- =====================================================

CREATE TABLE settings (
    id_setting BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    institution_name VARCHAR(150) NOT NULL,
    logo_path VARCHAR(500),

    opening_time TIME NOT NULL DEFAULT '08:00',
    closing_time TIME NOT NULL DEFAULT '17:00',

    pass_warning_limit INTEGER NOT NULL DEFAULT 5,

    smtp_host VARCHAR(255),
    smtp_port INTEGER,
    smtp_username VARCHAR(255),
    smtp_encryption VARCHAR(10) NOT NULL DEFAULT 'tls',
    smtp_sender_name VARCHAR(150),
    smtp_sender_email VARCHAR(255),

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

    guest_photo_retention_months INTEGER NOT NULL DEFAULT 6,
    visit_data_retention_years INTEGER NOT NULL DEFAULT 5,

    auto_backup_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    auto_backup_schedule VARCHAR(100),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_settings_smtp_encryption
        CHECK (smtp_encryption IN ('none', 'ssl', 'tls')),

    CONSTRAINT chk_settings_smtp_port
        CHECK (smtp_port IS NULL OR smtp_port BETWEEN 1 AND 65535),

    CONSTRAINT chk_settings_jwt
        CHECK (
            jwt_access_token_expiry > 0
            AND jwt_refresh_token_expiry > 0
        )
);

-- =====================================================
-- 6. BACKUP HISTORIES
-- =====================================================

CREATE TABLE backup_histories (
    id_backup BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_user BIGINT,
    type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',

    file_size_bytes BIGINT,
    file_path VARCHAR(500),
    error_message TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_backup_user
        FOREIGN KEY (id_user)
        REFERENCES users(id_user)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT chk_backup_type
        CHECK (type IN ('MANUAL', 'AUTOMATIC')),

    CONSTRAINT chk_backup_status
        CHECK (status IN ('SUCCESS', 'FAILED', 'IN_PROGRESS'))
);

CREATE INDEX idx_backup_created
    ON backup_histories(created_at);

-- =====================================================
-- 7. REFRESH TOKENS
-- Simpan hash token, bukan token asli.
-- =====================================================

CREATE TABLE refresh_tokens (
    id_token BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_user BIGINT NOT NULL,
    token_hash VARCHAR(255) NOT NULL UNIQUE,

    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_refresh_user
        FOREIGN KEY (id_user)
        REFERENCES users(id_user)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE INDEX idx_refresh_user ON refresh_tokens(id_user);
CREATE INDEX idx_refresh_expiry ON refresh_tokens(expires_at);

-- =====================================================
-- 8. AUDIT LOGS
-- =====================================================

CREATE TABLE audit_logs (
    id_log BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_user BIGINT,
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),

    description TEXT,
    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_audit_user
        FOREIGN KEY (id_user)
        REFERENCES users(id_user)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

CREATE INDEX idx_audit_user ON audit_logs(id_user);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
CREATE INDEX idx_audit_entity ON audit_logs(entity, entity_id);

-- =====================================================
-- 9. AUTO UPDATE updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_roles_updated
BEFORE UPDATE ON roles
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_users_updated
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_pass_updated
BEFORE UPDATE ON pass
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_visitors_updated
BEFORE UPDATE ON visitors
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_settings_updated
BEFORE UPDATE ON settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 10. INITIAL DATA
-- =====================================================

INSERT INTO roles (code, name, description, permissions)
VALUES
(
    'ADMIN',
    'Administrator',
    'Mengelola seluruh fitur sistem.',
    '["*"]'::jsonb
),
(
    'PETUGAS',
    'Petugas',
    'Mengelola operasional kunjungan.',
    '[
        "dashboard.read",
        "visitors.read",
        "visitors.create",
        "visitors.update",
        "visitors.checkin",
        "visitors.checkout",
        "pass.read",
        "pass.manage"
    ]'::jsonb
);

INSERT INTO settings (institution_name)
VALUES ('Nama Institusi');

-- =====================================================
-- END DATABASE
-- =====================================================
