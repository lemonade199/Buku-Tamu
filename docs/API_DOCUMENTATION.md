# Dokumentasi API — Sistem Buku Tamu Digital

Dokumentasi resmi Application Programming Interface (API) v1 untuk Sistem Informasi Buku Tamu Digital SEAMOLEC.

---

## 1. Ikhtisar & Arsitektur
- **Base URL:** `/api/v1`
- **Format Pertukaran Data:** `JSON` (`application/json`)
- **Autentikasi:** Bearer Token (JSON Web Token — JWT) pada header `Authorization: Bearer <access_token>`
- **Status Respons Standar:**
  - `200 OK`: Permintaan berhasil diproses.
  - `201 Created`: Entitas baru berhasil dibuat.
  - `400 Bad Request`: Parameter atau input bisnis tidak valid.
  - `401 Unauthorized`: Token tidak ada, tidak valid, atau akun dinonaktifkan.
  - `403 Forbidden`: Pengguna tidak memiliki hak akses (role tidak sesuai).
  - `404 Not Found`: Data atau endpoint tidak ditemukan.
  - `422 Unprocessable Entity`: Validasi format schema gagal.
  - `500 Internal Server Error`: Kesalahan internal server.

---

## 2. Modul Autentikasi (`/auth`)

### 2.1. Login Pengguna
- **Endpoint:** `POST /api/v1/auth/login`
- **Akses:** Publik
- **Request Body:**
  ```json
  {
    "username": "admin",
    "password": "Password123!"
  }
  ```
- **Response Success (200):**
  ```json
  {
    "success": true,
    "message": "Login berhasil.",
    "data": {
      "access_token": "eyJhbG...",
      "refresh_token": "eyJhbG...",
      "user": {
        "id_user": 1,
        "fullname": "Administrator",
        "username": "admin",
        "email": "admin@bukutamu.local",
        "role_code": "ADMIN"
      }
    }
  }
  ```

### 2.2. Perbarui Access Token (Refresh)
- **Endpoint:** `POST /api/v1/auth/refresh`
- **Akses:** Publik (menyertakan refresh token)
- **Request Body:**
  ```json
  {
    "refresh_token": "eyJhbG..."
  }
  ```

### 2.3. Logout
- **Endpoint:** `POST /api/v1/auth/logout`
- **Akses:** Memerlukan JWT Token

---

## 3. Modul Kunjungan Tamu (`/visitors`)

### 3.1. Pendaftaran Check-in Tamu (Kiosk / Resepsionis)
- **Endpoint:** `POST /api/v1/visitors/checkin`
- **Akses:** Publik / Kiosk / Resepsionis
- **Request Body:**
  ```json
  {
    "fullname": "Budi Santoso",
    "telephone": "081234567890",
    "institution": "Universitas Indonesia",
    "representing": "Fakultas Ilmu Komputer",
    "purpose": "Konsultasi kerjasama pelatihan",
    "no_pass": "01",
    "photo_base64": "data:image/jpeg;base64,..."
  }
  ```
- **Response (201):** Status tamu terdaftar sebagai `PENDING` menunggu persetujuan resepsionis.

### 3.2. Persetujuan Permohonan Tamu (Approval)
- **Endpoint:** `POST /api/v1/visitors/<id_visitor>/approve`
- **Akses:** `@role_required('ADMIN', 'PETUGAS')`
- **Dampak:** Status tamu berubah menjadi `APPROVED`, status kartu pass berubah menjadi `IN_USE`.

### 3.3. Penolakan Permohonan Tamu (Reject)
- **Endpoint:** `POST /api/v1/visitors/<id_visitor>/reject`
- **Akses:** `@role_required('ADMIN', 'PETUGAS')`
- **Request Body:**
  ```json
  {
    "reason": "Alasan penolakan registrasi"
  }
  ```

### 3.4. Pengembalian Kartu Pass & Check-out Tamu
- **Endpoint:** `POST /api/v1/visitors/<id_visitor>/checkout` atau `POST /api/v1/visitors/checkout`
- **Akses:** Memerlukan JWT Token (`@jwt_required()`)
- **Dampak:** Kolom `check_out_at` tercatat, status kartu pass kembali ke `AVAILABLE`.

### 3.5. Ekspor Data Kunjungan (Excel & PDF)
- **Endpoint:**
  - `GET /api/v1/visitors/export/excel?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`
  - `GET /api/v1/visitors/export/pdf?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`
- **Akses:** `@role_required('ADMIN', 'PETUGAS')`
- **Response:** File binary `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` atau `application/pdf`.

---

## 4. Modul Manajemen Kartu Pass (`/pass`)

### 4.1. Daftar Semua Kartu Pass
- **Endpoint:** `GET /api/v1/pass`
- **Akses:** Memerlukan JWT Token

### 4.2. Monitoring & Rak Slot Pass
- **Endpoint:**
  - `GET /api/v1/pass/rack`
  - `GET /api/v1/pass/monitoring`
- **Akses:** Memerlukan JWT Token

### 4.3. Tambah & Edit Kartu Pass Master
- **Endpoint:**
  - `POST /api/v1/pass`: Tambah kartu (`@role_required('ADMIN')`)
  - `PUT /api/v1/pass/<id_pass>`: Edit detail kartu (`@role_required('ADMIN')`)

---

## 5. Modul Pengaturan & Cadangan Database (`/settings`)

### 5.1. Ambil & Perbarui Pengaturan Sistem
- **Endpoint:** `GET /api/v1/settings` & `PUT /api/v1/settings`
- **Akses:** Memerlukan JWT Token

### 5.2. Buat Cadangan Database (Backup)
- **Endpoint:** `POST /api/v1/settings/backup`
- **Akses:** `@role_required('ADMIN')`
- **Response (201):**
  ```json
  {
    "success": true,
    "message": "Cadangan database berhasil dibuat.",
    "data": {
      "filename": "bukutamu_backup_20261119_100220.json",
      "size_formatted": "42.5 KB",
      "created_at": "2026-11-19T10:02:20.123456"
    }
  }
  ```

### 5.3. Riwayat & Unduh Cadangan Database
- **Endpoint:**
  - `GET /api/v1/settings/backups`: Ambil daftar file backup
  - `GET /api/v1/settings/backup/download/<filename>`: Unduh file backup
  - `DELETE /api/v1/settings/backup/<filename>`: Hapus file backup
- **Akses:** `@role_required('ADMIN')`

### 5.4. Pemulihan Database (Restore)
- **Endpoint:** `POST /api/v1/settings/restore`
- **Akses:** `@role_required('ADMIN')`
- **Body:** JSON `{ "filename": "nama_file.json" }` atau form-data upload file `file: <binary>`.
