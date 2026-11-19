Analyzed photo_storage.py:L1-60
Analyzed visitor_routes.py:L210-235
Ran find photo routes
Analyzed visitor_routes.py:L395-415
Analyzed auth_routes.py:L460-473
Ran test path traversal in logo endpoint · Exited with code 1
Analyzed entities.py:L100-145
Analyzed visitor.py:L1-34
Analyzed checkin_service.py:L40-75
Analyzed database.md:L1-60
Analyzed database.md:L80-140
Analyzed checkin_service.py:L150-175
Analyzed pass_routes.py:L240-300
Analyzed layout.tsx:L1-69
Analyzed page.tsx:L70-90
Analyzed api.ts:L30-75
Analyzed auth_service.py:L40-75
Analyzed auth_service.py:L75-88
Analyzed entities.py:L210-253
Ran check database.md for backup_histories
Analyzed page.tsx:L1-100
Ran check /visitors/active route
Analyzed visitor_routes.py:L365-395
Analyzed auth_routes.py:L200-260
Analyzed Sidebar.tsx:L1-60
Analyzed page.tsx:L20-50
Analyzed page.tsx:L50-80
Ran check route protection in master and settings
Analyzed auth_routes.py:L260-310

# Laporan Audit Menyeluruh: Project Buku Tamu (Ponytail Audit Post-Sprint 6)

Audit ini dilakukan setelah penyelesaian Sprint 6 untuk memeriksa kembali seluruh komponen sistem pada 10 fokus area utama (Backend Python/Flask, Frontend Next.js/TypeScript, Auth & RBAC, Alur Tamu & Pass, Konsistensi Status, Integritas Relasi Database, Keamanan, Error Handling, Bug Tersembunyi, dan Technical Debt).

Sesuai ketentuan, **tidak ada berkas atau konfigurasi database yang diubah pada sesi audit ini**.

---

## 1. Temuan CRITICAL (P0 — Berisiko Langsung Terhadap Keamanan & Kerahasiaan Data)

### 1.1. Akses Publik Tanpa Otentikasi pada Foto Wajah Tamu (Biometric / Privacy Breach)
- **Lokasi:** [`backend/app/routes/visitor_routes.py#L396-L408`](file:///c:/Buku-Tamu/backend/app/routes/visitor_routes.py#L396-L408)
- **Masalah:** Endpoint `GET /api/v1/visitors/<id_visitor>/photo` tidak dipasangi decorator `@jwt_required()`.
- **Dampak:** Siapapun dari jaringan publik/internet dapat melakukan scraping sekuensial (`/visitors/1/photo`, `/visitors/2/photo`, dst.) untuk mengunduh seluruh foto wajah tamu yang pernah berkunjung ke institusi tanpa otentikasi. Ini melanggar kepatuhan privasi data pribadi (UU PDP).
- **Rekomendasi:** Pasang decorator `@jwt_required()` agar hanya operator terautentikasi yang dapat memuat foto tamu.
- **Prioritas:** **Critical (P0)**

---

## 2. Temuan HIGH (P1 — Otorisasi Lemah & Kehilangan Data Operasional)

### 2.1. Otorisasi Lemah pada Endpoint Pembacaan Daftar Pengguna & Pengaturan Sistem
- **Lokasi:**
  - [`backend/app/routes/auth_routes.py#L235-L237`](file:///c:/Buku-Tamu/backend/app/routes/auth_routes.py#L235-L237) (`GET /api/v1/auth/users`)
  - [`backend/app/routes/setting_routes.py#L20-L22`](file:///c:/Buku-Tamu/backend/app/routes/setting_routes.py#L20-L22) (`GET /api/v1/settings`)
- **Masalah:** Kedua endpoint administratif ini hanya menggunakan decorator `@jwt_required()` biasa, bukan `@role_required('ADMIN')`.
- **Dampak:** Akun staf/resepsionis dapat memanggil endpoint ini dan melihat seluruh daftar akun staf (nama, email, nomor HP) serta seluruh konfigurasi institusi (host SMTP, username email, dan Client ID SSO).
- **Rekomendasi:** Ubah decorator kedua endpoint menjadi `@role_required('ADMIN')`.
- **Prioritas:** **High (P1)**

---

### 2.2. Ketiadaan Client-Side Route Guarding pada Halaman `/master` dan `/settings`
- **Lokasi:**
  - [`frontend/src/app/(dashboard)/master/page.tsx#L44-L60`](file:///c:/Buku-Tamu/frontend/src/app/(dashboard)/master/page.tsx#L44-L60)
  - [`frontend/src/app/(dashboard)/settings/page.tsx#L53-L75`](file:///c:/Buku-Tamu/frontend/src/app/(dashboard)/settings/page.tsx#L53-L75)
- **Masalah:** Meskipun menu sidebar disembunyikan untuk non-admin, kedua halaman ini tidak memiliki pengecekan `user?.role_code === 'ADMIN'`. Jika staf resepsionis mengetik URL `http://localhost:3000/master` atau `/settings` langsung di browser, halaman tetap terbuka penuh.
- **Dampak:** Resepsionis dapat mengakses antarmuka manajemen akun dan kartu master secara visual di browser.
- **Rekomendasi:** Tambahkan pengecekan peran di awal render; jika `!loading && user?.role_code !== 'ADMIN'`, arahkan otomatis via `router.replace('/dashboard')`.
- **Prioritas:** **High (P1)**

---

### 2.3. Data Omission: Nomor Telepon Tamu Tidak Disimpan ke Database
- **Lokasi:**
  - Form Kiosk: [`frontend/src/app/(dashboard)/checkin/page.tsx`](file:///c:/Buku-Tamu/frontend/src/app/(dashboard)/checkin/page.tsx)
  - Schema Pydantic: [`backend/app/schemas/visitor.py#L6`](file:///c:/Buku-Tamu/backend/app/schemas/visitor.py#L6)
  - Service Check-in: [`backend/app/services/checkin_service.py#L58-L68`](file:///c:/Buku-Tamu/backend/app/services/checkin_service.py#L58-L68)
  - Model Entity: [`backend/app/models/entities.py#L104-L121`](file:///c:/Buku-Tamu/backend/app/models/entities.py#L104-L121)
- **Masalah:** Pengunjung mengisi kolom nomor HP/telepon saat check-in, dan schema `CheckinRequest` menerimanya. Namun tabel `visitors` di database dan model `Visitor` tidak memiliki kolom `telephone`. Akibatnya, `checkin_service.py` membuang nilai nomor HP tamu secara diam-diam.
- **Dampak:** Resepsionis atau admin tidak dapat menghubungi tamu jika terjadi barang tertinggal, kartu pass belum dikembalikan, atau keadaan darurat institusi.
- **Rekomendasi:** Tambahkan kolom `telephone VARCHAR(25)` pada model `Visitor` dan tabel `visitors` di migrasi PostgreSQL, lalu simpan nilainya di `checkin_service.py`.
- **Prioritas:** **High (P1)**

---

### 2.4. Resepsionis Dapat Mengubah Status Kartu Menjadi Maintenance/Lost
- **Lokasi:** [`backend/app/routes/pass_routes.py#L249-L251`](file:///c:/Buku-Tamu/backend/app/routes/pass_routes.py#L249-L251)
- **Masalah:** Endpoint `PUT /api/v1/pass/<id_pass>/status` hanya dipasangi `@jwt_required()`, membolehkan status diubah ke `MAINTENANCE`, `LOST`, atau `INACTIVE`.
- **Dampak:** Staf resepsionis dapat menonaktifkan kartu operasional atau menandai kartu hilang tanpa verifikasi admin.
- **Rekomendasi:** Batasi perubahan ke status administratif (`MAINTENANCE`, `LOST`, `INACTIVE`) hanya untuk role `ADMIN`.
- **Prioritas:** **High (P1)**

---

## 3. Temuan MEDIUM (P2 — Efisiensi Server, Integritas Sesi & Standar Web)

### 3.1. Beban Koneksi Database Ganda per Request pada JWT Token Blocklist Loader
- **Lokasi:** [`backend/app/__init__.py#L28-L47`](file:///c:/Buku-Tamu/backend/app/__init__.py#L28-L47)
- **Masalah:** Fungsi `check_if_token_revoked` membuka sesi `get_db_session()`, melakukan query `user.is_active`, lalu menutup sesi. Setelah itu, route handler yang dipanggil membuka sesi database kedua.
- **Dampak:** Setiap 1 panggilan API terotentikasi membuka dan menutup 2 koneksi database berturut-turut. Dengan interval polling 4 detik, beban koneksi pool PostgreSQL meningkat dua kali lipat.
- **Rekomendasi:** Gunakan caching in-memory sederhana (misal: dictionary/TTL cache 15–30 detik per `user_id`) atau satukan pengecekan status pengguna di sesi request context.
- **Prioritas:** **Medium (P2)**

---

### 3.2. Konflik Spesifikasi CORS Wildcard dengan `supports_credentials=True`
- **Lokasi:** [`backend/app/__init__.py#L25`](file:///c:/Buku-Tamu/backend/app/__init__.py#L25)
- **Masalah:** `CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)`. Standar W3C/Fetch CORS melarang penggabungan `Access-Control-Allow-Origin: *` dengan `Access-Control-Allow-Credentials: true`.
- **Dampak:** Browser modern akan menolak respons preflight jika di masa depan frontend beralih ke cookie-based session atau jika header `credentials: 'include'` dikirimkan.
- **Rekomendasi:** Tentukan whitelist origin yang spesifik dari environment variable (misal: `http://localhost:3000`, `https://bukutamu.instansi.go.id`).
- **Prioritas:** **Medium (P2)**

---

### 3.3. Spam HTTP Polling Tanpa Listener Visibilitas Browser
- **Lokasi:**
  - [`frontend/src/app/(dashboard)/layout.tsx#L27-L38`](file:///c:/Buku-Tamu/frontend/src/app/(dashboard)/layout.tsx#L27-L38) (polling `/auth/me` tiap 4 detik)
  - [`frontend/src/app/(dashboard)/dashboard/page.tsx#L76`](file:///c:/Buku-Tamu/frontend/src/app/(dashboard)/dashboard/page.tsx#L76) (polling 3 endpoint tiap 4 detik)
- **Masalah:** Polling berjalan terus-menerus tanpa mengecek apakah tab browser sedang aktif atau terminimalkan (`document.hidden`).
- **Dampak:** Menghasilkan 60 request per menit per tab terbuka, memboroskan bandwidth klien dan log server.
- **Rekomendasi:** Tambahkan pengecekan `if (document.hidden) return;` di dalam fungsi interval polling.
- **Prioritas:** **Medium (P2)**

---

### 3.4. Tabel `backup_histories` Tidak Terisi saat Pencadangan Berhasil
- **Lokasi:** [`backend/app/services/backup_service.py#L64-L77`](file:///c:/Buku-Tamu/backend/app/services/backup_service.py#L64-L77)
- **Masalah:** Saat backup dibuat, service mencatat ke `AuditLog`, tetapi tidak menambahkan baris ke model `BackupHistory` yang sudah didefinisikan di `database.md` dan `entities.py`.
- **Dampak:** Data riwayat di tabel PostgreSQL `backup_histories` tetap kosong (*dead schema*).
- **Rekomendasi:** Sisipkan pembuatan entitas `BackupHistory(id_user=..., file_path=..., file_size_bytes=..., status='SUCCESS')` di `backup_service.py`.
- **Prioritas:** **Medium (P2)**

---

## 4. Temuan LOW (P3 — Kebersihan Kode & Sanitasi Path)

### 4.1. Potensi Sanitasi Path Kurang Ketat pada `get_photo_path`
- **Lokasi:** [`backend/app/utils/photo_storage.py#L48-L50`](file:///c:/Buku-Tamu/backend/app/utils/photo_storage.py#L48-L50)
- **Masalah:** `get_photo_path(filename)` menggabungkan path tanpa membungkus `filename` dengan `os.path.basename()`.
- **Dampak:** Jika ada fungsi baru di masa mendatang yang memanggil `get_photo_path` dengan input mentah dari pengguna, berpotensi terjadi *path traversal*.
- **Rekomendasi:** Tambahkan `clean_filename = os.path.basename(filename)` di dalam `get_photo_path`.
- **Prioritas:** **Low (P3)**

---

### 4.2. Peringatan Deprecated `datetime.utcnow()` pada Python 3.12+
- **Lokasi:** Model entities, repositories, dan services (menghasilkan 800+ warning pada eksekusi pytest).
- **Masalah:** Menggunakan `datetime.utcnow()` yang dijadwalkan dihapus pada rilis Python masa depan.
- **Dampak:** Polusi log pengujian backend.
- **Rekomendasi:** Migrasikan bertahap ke `datetime.now(timezone.utc)`.
- **Prioritas:** **Low (P3)**

---

## Kesimpulan Kesiapan Project

Setelah penyelesaian Sprint 6, kondisi stabilitas sistem Buku Tamu meningkat signifikan:
- **Pengujian:** 20 dari 20 unit & integration test backend lulus 100%.
- **Frontend Build:** Next.js terkompilasi bersih tanpa error TypeScript/lint.
- **Fitur Baru:** Backup snapshot JSON, download, dan restore database berfungsi normal.

Namun, sebelum deploy ke production publik, aplikasi **wajib menyelesaikan 1 temuan Critical (P0) dan 3 temuan High (P1)** terkait otorisasi foto tamu, proteksi endpoint master pengguna/pengaturan, serta persistensi nomor telepon tamu.

---

## Urutan Rekomendasi Perbaikan Berdasarkan Prioritas

1. **Prioritas 1 (P0):** Pasang `@jwt_required()` pada endpoint `GET /api/v1/visitors/<id_visitor>/photo`.
2. **Prioritas 2 (P1):** Pasang `@role_required('ADMIN')` pada `GET /api/v1/auth/users` dan `GET /api/v1/settings`.
3. **Prioritas 3 (P1):** Tambahkan client-side role guard di halaman frontend `/master` dan `/settings` agar staf non-admin dialihkan ke `/dashboard`.
4. **Prioritas 4 (P1):** Sinkronkan kolom `telephone` pada model `Visitor` dan simpan nomor telepon tamu saat check-in.
5. **Prioritas 5 (P2):** Tambahkan guard `document.hidden` pada polling frontend dan rapikan whitelist CORS.

---

*Apakah Anda menyetujui laporan audit di atas? Mohon konfirmasi sebelum perbaikan diimplementasikan.*