# FINALISASI ENTITY RELATIONSHIP DIAGRAM (ERD)
# SISTEM INFORMASI BUKU TAMU DIGITAL

**Versi:** 1.0 (Sprint 1 — Analisis dan Perancangan)  
**Database Management System:** PostgreSQL 15+  
**Referensi Skema:** [database.md](file:///c:/Buku-Tamu/database.md) & [prd.md](file:///c:/Buku-Tamu/prd.md)  

---

## 1. Diagram ERD Relasional

Berikut adalah diagram relasi antartabel dalam format Mermaid yang merefleksikan seluruh entitas dalam sistem buku tamu digital:

```mermaid
erDiagram
    ROLES ||--o{ USERS : "assigned to"
    USERS ||--o{ PASS : "handled over / recorded by"
    USERS ||--o{ PASS : "achieved / received by"
    USERS ||--o{ REFRESH_TOKENS : "owns"
    USERS ||--o{ BACKUP_HISTORIES : "initiates"
    USERS ||--o{ AUDIT_LOGS : "performs"
    PASS ||--o{ VISITORS : "allocated to"

    ROLES {
        BIGINT id_role PK
        VARCHAR code UK "ADMIN, PETUGAS"
        VARCHAR name
        TEXT description
        BOOLEAN is_active
        JSONB permissions "Array of permission codes"
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    USERS {
        BIGINT id_user PK
        BIGINT id_role FK
        VARCHAR fullname
        VARCHAR username UK
        VARCHAR email UK
        VARCHAR hash_password "Argon2 / bcrypt"
        VARCHAR telephone
        BOOLEAN is_active
        TIMESTAMP last_login_at
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    PASS {
        BIGINT id_pass PK
        VARCHAR no_pass UK "Nomor fisik pass"
        VARCHAR status "AVAILABLE, IN_USE, MAINTENANCE, LOST, INACTIVE"
        VARCHAR slot "Posisi rak kartu"
        BIGINT handled_over_id FK "User petugas penyerah"
        TIMESTAMP handled_over_at
        BIGINT achieve_id FK "User petugas penerima kembali"
        TIMESTAMP achieve_at
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    VISITORS {
        BIGINT id_visitor PK
        BIGINT id_pass FK
        VARCHAR fullname
        VARCHAR telephone
        VARCHAR institution
        VARCHAR representing "Pihak yang dikunjungi"
        TEXT purpose
        TIMESTAMP check_in_at
        TIMESTAMP check_out_at "NULL jika masih aktif"
        VARCHAR capture_id "Path/ID foto wajib pengunjung"
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    SETTINGS {
        BIGINT id_setting PK
        VARCHAR institution_name
        VARCHAR logo_path
        TIME opening_time
        TIME closing_time
        INTEGER pass_warning_limit
        VARCHAR smtp_host
        INTEGER smtp_port
        VARCHAR smtp_username
        VARCHAR smtp_encryption
        VARCHAR smtp_sender_name
        VARCHAR smtp_sender_email
        BOOLEAN notify_app_checkin
        BOOLEAN notify_app_backup_fail
        BOOLEAN notify_email_monthly_report
        BOOLEAN notify_email_new_account
        BOOLEAN notify_email_reset_password
        VARCHAR admin_notification_email
        INTEGER jwt_access_token_expiry
        INTEGER jwt_refresh_token_expiry
        BOOLEAN sso_enabled
        VARCHAR sso_issuer
        VARCHAR sso_client_id
        INTEGER guest_photo_retention_months
        INTEGER visit_data_retention_years
        BOOLEAN auto_backup_enabled
        VARCHAR auto_backup_schedule
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    BACKUP_HISTORIES {
        BIGINT id_backup PK
        BIGINT id_user FK
        VARCHAR type "MANUAL, AUTOMATIC"
        VARCHAR status "SUCCESS, FAILED, IN_PROGRESS"
        BIGINT file_size_bytes
        VARCHAR file_path
        TEXT error_message
        TIMESTAMP created_at
    }

    REFRESH_TOKENS {
        BIGINT id_token PK
        BIGINT id_user FK
        VARCHAR token_hash UK
        TIMESTAMP expires_at
        TIMESTAMP revoked_at
        TIMESTAMP created_at
    }

    AUDIT_LOGS {
        BIGINT id_log PK
        BIGINT id_user FK
        VARCHAR action
        VARCHAR entity
        VARCHAR entity_id
        TEXT description
        INET ip_address
        TEXT user_agent
        TIMESTAMP created_at
    }
```

---

## 2. Rincian Relasi & Integritas Data

### 2.1 Relasi `roles` -> `users` (1 to Many)
- `users.id_role` mengacu pada `roles.id_role`.
- **Constraint:** `ON UPDATE CASCADE ON DELETE RESTRICT`. Role tidak boleh dihapus jika masih ada pengguna aktif yang menggunakannya.

### 2.2 Relasi `pass` -> `visitors` (1 to Many, dengan Partial Unique Constraint)
- Satu pass fisik dapat digunakan berulang kali oleh pengunjung yang berbeda sepanjang waktu.
- **Kondisi Khusus:** Pada saat bersamaan, satu pass hanya boleh aktif pada **1** pengunjung.
- **Implementasi Indeks Unik Parsial (PostgreSQL):**
  ```sql
  CREATE UNIQUE INDEX uq_visitors_active_pass
      ON visitors(id_pass)
      WHERE check_out_at IS NULL;
  ```
  Indeks parsial ini menjamin pada tingkat database bahwa tidak akan terjadi *double check-in* atau bentrok pass yang sama secara bersamaan (*concurrency-safe*).

### 2.3 Relasi `users` -> `pass` (1 to Many)
- `pass.handled_over_id` (petugas yang menyerahkan pass saat check-in).
- `pass.achieve_id` (petugas yang menerima pass kembali saat check-out).
- **Constraint:** `ON UPDATE CASCADE ON DELETE SET NULL`.

### 2.4 Relasi `users` -> `refresh_tokens` (1 to Many)
- Token refresh disimpan dalam bentuk hash kriptografi (`token_hash`), dengan pencatatan waktu kadaluwarsa (`expires_at`) dan waktu pembatalan/revokasi (`revoked_at`).
- **Constraint:** `ON UPDATE CASCADE ON DELETE CASCADE`.

### 2.5 Relasi `users` -> `audit_logs` & `backup_histories`
- Mencatat jejak audit seluruh aktivitas krusial pengguna (login, ubah pass, check-out paksa, backup/restore data).
- **Constraint:** `ON DELETE SET NULL` agar log audit tetap tersimpan sebagai bukti historis meskipun akun dihapus.

---

## 3. Strategi Indexing Kinerja Query

Untuk memastikan efisiensi pencarian pada saat transaksi ramai di meja resepsionis:

| Tabel | Indeks | Tujuan Penggunaan |
|---|---|---|
| `users` | `idx_users_role` | Filter pengguna berdasarkan role |
| `users` | `idx_users_active` | Filter pengguna aktif untuk autentikasi cepat |
| `pass` | `idx_pass_status` | Filter ketersediaan pass (`AVAILABLE`) saat check-in |
| `visitors`| `uq_visitors_active_pass` | Integritas pass aktif (hanya 1 kunjungan tanpa checkout) |
| `visitors`| `idx_visitors_fullname` | Autocomplete & pencarian nama pengunjung |
| `visitors`| `idx_visitors_telephone`| Pencarian cepat via nomor kontak WhatsApp/telepon |
| `visitors`| `idx_visitors_checkin` | Filter laporan dan statistik kunjungan harian/bulanan |
| `visitors`| `idx_visitors_checkout` | Filter tamu yang sedang aktif (`IS NULL`) |
| `refresh_tokens` | `idx_refresh_user`, `idx_refresh_expiry` | Validasi token refresh aktif dan pembersihan berkala |
| `audit_logs` | `idx_audit_user`, `idx_audit_created`, `idx_audit_entity` | Pencarian jejak audit sistem |

---

*Dokumen ERD ini telah diselaraskan penuh dengan `database.md` dan siap diimplementasikan menggunakan SQLAlchemy ORM serta migrasi Alembic pada Sprint 2.*
