# PRODUCT REQUIREMENTS DOCUMENT (PRD)
# SISTEM INFORMASI BUKU TAMU DIGITAL

**Versi:** 1.0  
**Status:** Draft  
**Metode Pengembangan:** Agile Scrum  
**Backend:** Python  
**Frontend:** TypeScript  
**Database:** MySQL / MariaDB  
**Platform:** Website

---

# 1. Pendahuluan

## 1.1 Latar Belakang

Pencatatan tamu secara manual memiliki beberapa keterbatasan, seperti proses pencatatan yang kurang efisien, kesulitan dalam pencarian riwayat kunjungan, risiko kehilangan data, serta keterbatasan dalam pemantauan aktivitas pengunjung.

Oleh karena itu, diperlukan sebuah Sistem Informasi Buku Tamu Digital berbasis website yang dapat membantu institusi dalam mengelola data pengunjung, proses check-in dan check-out, pengelolaan nomor pass, serta penyediaan laporan kunjungan secara terstruktur.

## 1.2 Tujuan Produk

1. Mendigitalisasi proses pencatatan kunjungan tamu.
2. Mempermudah petugas dalam mengelola data pengunjung.
3. Meningkatkan keamanan dan akurasi data kunjungan.
4. Mempermudah pemantauan pengunjung yang sedang berada di lingkungan institusi.
5. Menyediakan riwayat kunjungan dan laporan secara digital.
6. Mengelola penggunaan nomor pass agar dapat digunakan kembali setelah dikembalikan.

## 1.3 Target Pengguna

- Administrator: Mengelola keseluruhan sistem.
- Petugas: Mengelola proses penerimaan dan pengembalian pass serta data kunjungan.
- Pengunjung: Melakukan proses registrasi kunjungan dengan bantuan petugas.

---

# 2. Ruang Lingkup Produk

## 2.1 Fitur Utama

### A. Authentication dan Authorization
- Login pengguna.
- Logout pengguna.
- Pengelolaan akun pengguna.
- Pengelolaan role dan permission.
- Pengamanan endpoint berdasarkan hak akses.
- Pengelolaan sesi dan token autentikasi.

### B. Dashboard
- Menampilkan jumlah kunjungan hari ini.
- Menampilkan jumlah pengunjung yang sedang berada di institusi.
- Menampilkan jumlah pengunjung yang sudah check-out.
- Menampilkan statistik kunjungan.
- Menampilkan informasi ketersediaan pass.

### C. Manajemen Pengunjung
- Menambahkan data pengunjung.
- Mengubah data pengunjung.
- Melihat detail pengunjung.
- Melihat riwayat kunjungan.
- Mencari pengunjung berdasarkan nama atau nomor telepon.
- Menyimpan identitas, institusi, dan pihak yang diwakili.
- Menyimpan foto pengunjung.

### D. Check-in Pengunjung
- Petugas memasukkan data pengunjung.
- Sistem meminta pengambilan foto melalui kamera website.
- Foto wajib berhasil diambil dan diunggah.
- Sistem memvalidasi ketersediaan pass.
- Sistem mencatat waktu masuk secara otomatis.
- Sistem mengubah status pass menjadi sedang digunakan.
- Data kunjungan disimpan ke database.

**Ketentuan:** Check-in tidak dapat diselesaikan apabila foto belum berhasil diambil dan disimpan.

### E. Check-out Pengunjung
- Petugas mencari data kunjungan aktif.
- Sistem menampilkan identitas pengunjung.
- Petugas melakukan konfirmasi pengembalian pass.
- Sistem mencatat waktu keluar secara otomatis.
- Status kunjungan berubah menjadi selesai.
- Status pass kembali menjadi tersedia.

### F. Manajemen Pass
- Menambahkan nomor pass.
- Mengubah informasi pass.
- Melihat daftar pass.
- Melihat status pass.
- Mengetahui pass yang sedang digunakan.
- Mengetahui pass yang tersedia.
- Menggunakan kembali pass setelah dikembalikan.

Ketentuan penggunaan pass:
- Satu pass hanya boleh digunakan oleh satu pengunjung pada waktu bersamaan.
- Satu pass dapat digunakan untuk beberapa kunjungan secara bergantian.
- Pass tidak dapat digunakan kembali selama masih dalam status digunakan.

### G. Laporan dan Riwayat
- Melihat seluruh riwayat kunjungan.
- Filter berdasarkan tanggal.
- Filter berdasarkan nama pengunjung.
- Filter berdasarkan institusi.
- Filter berdasarkan status kunjungan.
- Menampilkan detail waktu masuk dan keluar.
- Ekspor laporan kunjungan ke PDF atau Excel.

### H. Pengaturan Sistem
- Pengaturan nama institusi.
- Pengaturan logo institusi.
- Pengaturan jam operasional.
- Pengaturan batas peringatan pass.
- Pengaturan notifikasi.
- Pengaturan SMTP.
- Pengaturan autentikasi dan token.
- Pengaturan retensi data dan foto.
- Pengaturan backup database.

### I. Backup dan Restore
- Backup database secara manual.
- Backup database otomatis.
- Melihat riwayat backup.
- Mengunduh file backup.
- Melakukan restore database dengan otorisasi administrator.

---

# 3. Kebutuhan Fungsional

| ID | Kebutuhan | Prioritas |
|---|---|---|
| FR-001 | Login dan logout | Must Have |
| FR-002 | Manajemen akun pengguna | Must Have |
| FR-003 | Manajemen role dan permission | Must Have |
| FR-004 | Dashboard statistik | Must Have |
| FR-005 | Registrasi pengunjung | Must Have |
| FR-006 | Pengambilan foto wajib | Must Have |
| FR-007 | Check-in pengunjung | Must Have |
| FR-008 | Check-out pengunjung | Must Have |
| FR-009 | Manajemen nomor pass | Must Have |
| FR-010 | Penggunaan ulang pass | Must Have |
| FR-011 | Riwayat kunjungan | Must Have |
| FR-012 | Pencarian dan filter data | Must Have |
| FR-013 | Ekspor laporan | Should Have |
| FR-014 | Pengaturan sistem | Should Have |
| FR-015 | Backup dan restore | Should Have |
| FR-016 | Notifikasi email | Could Have |
| FR-017 | Single Sign-On (SSO) | Could Have |

Prioritas:
- Must Have: Wajib tersedia untuk MVP.
- Should Have: Penting, tetapi dapat dikembangkan setelah MVP.
- Could Have: Fitur tambahan.

---

# 4. Kebutuhan Nonfungsional

## 4.1 Security
- Password disimpan menggunakan algoritma hashing yang aman.
- Menggunakan autentikasi berbasis token.
- Setiap endpoint memiliki validasi hak akses.
- Validasi input dilakukan pada backend.
- File foto tidak boleh dapat diakses secara publik tanpa otorisasi.
- Informasi rahasia tidak disimpan dalam repository.
- Menggunakan HTTPS pada lingkungan produksi.

## 4.2 Performance
- Halaman utama harus dapat dimuat dengan responsif.
- Query database harus menggunakan indeks yang sesuai.
- Proses check-in dan check-out harus konsisten.
- Mencegah penggunaan pass secara bersamaan.

## 4.3 Reliability
- Data kunjungan tidak boleh hilang ketika terjadi kesalahan proses.
- Transaksi database digunakan pada proses check-in dan check-out.
- Sistem menyediakan mekanisme backup.
- Sistem menangani kesalahan secara terstruktur.

## 4.4 Usability
- Tampilan website responsif.
- Navigasi mudah dipahami.
- Formulir memiliki validasi yang jelas.
- Pengguna mendapatkan informasi ketika proses berhasil atau gagal.

---

# 5. Teknologi yang Digunakan

## 5.1 Backend

Bahasa pemrograman: Python.

Teknologi yang direkomendasikan:
- Python 3.12+
- Flask sebagai framework REST API.
- SQLAlchemy sebagai ORM.
- Alembic untuk database migration.
- Flask-JWT-Extended untuk autentikasi JWT.
- Pydantic atau Marshmallow untuk validasi data.
- Flasgger untuk dokumentasi API.
- Pytest untuk testing.

## 5.2 Frontend

Bahasa pemrograman: TypeScript.

Teknologi yang direkomendasikan:
- Next.js sebagai framework frontend.
- React sebagai library antarmuka.
- TypeScript sebagai bahasa pemrograman.
- Tailwind CSS untuk styling.
- shadcn/ui untuk komponen antarmuka.
- React Hook Form untuk pengelolaan form.
- Zod untuk validasi.
- TanStack Query untuk pengelolaan data API.

## 5.3 Database

- MySQL 8+ atau MariaDB 10.6+.
- Engine InnoDB.
- Encoding utf8mb4.
- Relasi menggunakan foreign key.
- Indexing pada kolom pencarian dan filter.

## 5.4 Arsitektur Sistem

Sistem menggunakan arsitektur Client-Server dengan REST API.

Alur komunikasi:

1. Pengguna membuka website melalui browser.
2. Frontend Next.js menampilkan antarmuka.
3. Frontend mengirimkan HTTP request ke backend.
4. Backend Python memproses request dan validasi.
5. Backend berkomunikasi dengan database.
6. Backend mengembalikan response JSON.
7. Frontend menampilkan hasil kepada pengguna.

---

### Database Management System

Sistem menggunakan PostgreSQL sebagai Database Management System (DBMS) untuk menyimpan dan mengelola seluruh data aplikasi.

PostgreSQL dipilih karena mendukung relational database, transaksi ACID, foreign key, indexing, JSONB, serta partial unique index.

Implementasi database menggunakan SQLAlchemy 2.x sebagai ORM dan Alembic sebagai database migration tool.

Konfigurasi database:
- DBMS: PostgreSQL
- Storage Engine: PostgreSQL Native
- Character Encoding: UTF8
- ORM: SQLAlchemy 2.x
- Migration: Alembic
- Permission Storage: JSONB
- Primary Key: BIGINT IDENTITY
- Database Connection: Environment Variables

Seluruh interaksi database dilakukan melalui backend Python Flask REST API. Frontend TypeScript tidak diperbolehkan mengakses database secara langsung.

## struktur database

di database.md
---

# 7. Hak Akses Pengguna

## Administrator
- Mengakses seluruh dashboard.
- Mengelola akun pengguna.
- Mengelola role dan permission.
- Mengelola data pengunjung.
- Mengelola pass.
- Mengakses laporan.
- Mengatur konfigurasi sistem.
- Mengelola backup dan restore.

## Petugas
- Mengakses dashboard operasional.
- Melakukan registrasi pengunjung.
- Mengambil foto pengunjung.
- Melakukan check-in.
- Melakukan check-out.
- Melihat data dan riwayat kunjungan.
- Melihat ketersediaan pass.

Pengunjung tidak harus memiliki akun untuk melakukan kunjungan karena proses pencatatan dilakukan melalui petugas.

---

# 8. User Stories dan Acceptance Criteria

## US-001: Login
Sebagai petugas, saya ingin login agar dapat mengakses fitur sesuai hak akses saya.

Acceptance Criteria:
- Sistem menerima username/email dan password yang valid.
- Sistem menolak kredensial yang salah.
- Sistem mengarahkan pengguna ke dashboard.
- Pengguna hanya dapat mengakses fitur sesuai permission.

## US-002: Registrasi Pengunjung
Sebagai petugas, saya ingin mencatat identitas pengunjung agar data kunjungan tersimpan secara digital.

Acceptance Criteria:
- Formulir identitas dapat diisi.
- Data wajib divalidasi.
- Foto harus berhasil diambil.
- Foto harus berhasil diunggah.
- Sistem menyimpan data pengunjung.

## US-003: Check-in
Sebagai petugas, saya ingin melakukan check-in agar kedatangan pengunjung tercatat.

Acceptance Criteria:
- Pass harus tersedia.
- Foto wajib tersedia.
- Waktu masuk dicatat otomatis.
- Status pass berubah menjadi sedang digunakan.
- Sistem mencegah penggunaan pass ganda.

## US-004: Check-out
Sebagai petugas, saya ingin memproses pengembalian pass agar pengunjung tercatat sudah meninggalkan institusi.

Acceptance Criteria:
- Hanya kunjungan aktif yang dapat di-check-out.
- Sistem mencatat waktu keluar.
- Status kunjungan berubah menjadi selesai.
- Status pass berubah menjadi tersedia.
- Pass dapat digunakan kembali.

## US-005: Laporan
Sebagai administrator, saya ingin melihat laporan kunjungan agar dapat memantau aktivitas pengunjung.

Acceptance Criteria:
- Sistem menampilkan data kunjungan.
- Pengguna dapat melakukan filter.
- Sistem menampilkan detail waktu masuk dan keluar.
- Data dapat diekspor sesuai format yang disediakan.

---

# 9. Metode Pengembangan: Agile Scrum

Pengembangan dilakukan menggunakan metode Scrum dengan sprint berdurasi dua minggu.

## 9.1 Scrum Roles

**Product Owner**
- Menentukan kebutuhan produk.
- Menyusun dan memprioritaskan Product Backlog.
- Memvalidasi hasil pengembangan.

**Scrum Master**
- Memastikan Scrum berjalan dengan baik.
- Mengatasi hambatan tim.
- Mengatur kegiatan Scrum.

**Development Team**
- Backend Developer.
- Frontend Developer.
- UI/UX Designer.
- Quality Assurance / Tester.

Satu orang dapat memegang lebih dari satu tanggung jawab apabila ukuran tim terbatas.

## 9.2 Scrum Events

1. Sprint Planning: Menentukan target dan pekerjaan sprint.
2. Daily Scrum: Evaluasi progres harian maksimal 15 menit.
3. Sprint Review: Mendemonstrasikan hasil sprint.
4. Sprint Retrospective: Mengevaluasi proses kerja tim.


## struktur yang disarankan
buku-tamu/
├── backend/
│   ├── app/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── middleware/
│   │   └── utils/
│   ├── migrations/
│   ├── tests/
│   ├── config.py
│   ├── requirements.txt
│   └── run.py
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   └── lib/
│   └── package.json
│
└── README.md
## 9.3 Product Backlog dan Sprint Plan

### Sprint 1 — Analisis dan Perancangan
Durasi: 2 minggu.

Task:
- Analisis kebutuhan pengguna.
- Penyusunan requirement.
- Pembuatan user flow.
- Pembuatan wireframe dan mockup.
- Finalisasi ERD.
- Perancangan arsitektur sistem.
- Setup repository Git.

Output:
- PRD.
- UI/UX Design.
- ERD.
- Project Structure.
- Product Backlog.

### Sprint 2 — Fondasi Backend dan Frontend
Durasi: 2 minggu.

Backend:
- Setup Flask.
- Setup SQLAlchemy.
- Setup Alembic.
- Implementasi database.
- Implementasi authentication.
- Implementasi authorization.

Frontend:
- Setup Next.js.
- Setup TypeScript.
- Setup Tailwind CSS.
- Implementasi layout.
- Implementasi halaman login.
- Implementasi dashboard awal.

Output:
- Backend API dasar.
- Frontend dasar.
- Database berjalan.
- Login dan authorization.

### Sprint 3 — Manajemen Pengunjung dan Pass
Durasi: 2 minggu.

Backend:
- API pengelolaan pengunjung.
- API pengelolaan pass.
- Validasi data.
- Implementasi pengambilan dan penyimpanan foto.
- Implementasi check-in.
- Implementasi transaksi database.

Frontend:
- Form registrasi pengunjung.
- Integrasi kamera browser.
- Tampilan pengambilan foto.
- Halaman manajemen pass.
- Integrasi API pengunjung.
            
Output:
- Fitur registrasi pengunjung.
- Pengambilan foto.
- Manajemen pass.
- Check-in.

### Sprint 4 — Check-out dan Riwayat
Durasi: 2 minggu.

Backend:
- API check-out.
- Validasi pass.
- Pengelolaan status kunjungan.
- API riwayat kunjungan.
- API pencarian dan filter.

Frontend:
- Halaman check-out.
- Daftar pengunjung aktif.
- Riwayat kunjungan.
- Detail pengunjung.
- Integrasi API.

Output:
- Check-out.
- Pengembalian pass.
- Riwayat kunjungan.

### Sprint 5 — Dashboard dan Laporan
Durasi: 2 minggu.

Backend:
- API statistik dashboard.
- API laporan kunjungan.
- Implementasi ekspor PDF/Excel.

Frontend:
- Dashboard statistik.
- Visualisasi data.
- Halaman laporan.
- Filter laporan.
- Fitur ekspor.

Output:
- Dashboard lengkap.
- Laporan kunjungan.

### Sprint 6 — Pengaturan, Testing dan Deployment
Durasi: 2 minggu.

Backend:
- Pengaturan sistem.
- Backup dan restore.
- Audit keamanan.
- Optimasi database.
- API documentation.

Frontend:
- Halaman pengaturan.
- Penyempurnaan UI.
- Responsivitas.
- Penanganan error.
- Pengujian integrasi.

QA:
- Unit testing.
- Integration testing.
- End-to-end testing.
- UAT.
- Pengujian keamanan dasar.

Deployment:
- Setup production environment.
- Konfigurasi HTTPS.
- Deployment backend.
- Deployment frontend.
- Konfigurasi database.
- Monitoring aplikasi.

Output:
- MVP siap digunakan.
- Dokumentasi API.
- Hasil pengujian.
- Aplikasi production.

---

# 10. Definition of Done (DoD)

Sebuah task dianggap selesai apabila:

1. Implementasi sesuai acceptance criteria.
2. Kode telah mengikuti standar proyek.
3. Tidak terdapat error kritis.
4. Validasi backend sudah diterapkan.
5. API sudah diuji.
6. Integrasi frontend dan backend berjalan.
7. Tidak merusak fitur yang sudah ada.
8. Perubahan telah melalui code review.
9. Dokumentasi diperbarui apabila diperlukan.

---

# 11. Pengujian Sistem

Jenis pengujian:

- Unit Testing: Menguji fungsi secara terpisah.
- Integration Testing: Menguji hubungan antarbagian sistem.
- API Testing: Menguji endpoint backend.
- UI Testing: Menguji tampilan dan interaksi.
- End-to-End Testing: Menguji alur pengguna dari awal sampai akhir.
- Security Testing: Menguji autentikasi, authorization, dan validasi input.
- User Acceptance Testing: Memastikan aplikasi sesuai kebutuhan pengguna.

Skenario pengujian penting:
- Login dengan kredensial salah.
- Petugas mencoba mengakses fitur administrator.
- Check-in tanpa foto.
- Check-in menggunakan pass yang sedang digunakan.
- Check-out terhadap kunjungan yang sudah selesai.
- Menggunakan kembali pass setelah pengembalian.
- Dua petugas mencoba menggunakan pass yang sama secara bersamaan.

---

# 12. Indikator Keberhasilan Produk

Produk dinyatakan memenuhi target MVP apabila:

1. Pengguna dapat login sesuai hak akses.
2. Petugas dapat mencatat pengunjung.
3. Foto wajib berhasil diambil sebelum check-in.
4. Pengunjung dapat melakukan check-in dan check-out.
5. Pass dapat digunakan kembali setelah dikembalikan.
6. Sistem mencegah penggunaan pass secara bersamaan.
7. Riwayat kunjungan tersimpan dengan benar.
8. Administrator dapat melihat statistik kunjungan.
9. Laporan dapat diakses dan diekspor.
10. Tidak terdapat bug kritis pada alur utama.
11. Sistem berhasil melewati pengujian dan UAT.

---

# 13. Risiko dan Mitigasi

| Risiko | Mitigasi |
|---|---|
| Kamera tidak mendapatkan izin | Berikan informasi dan petunjuk izin kamera |
| Upload foto gagal | Check-in dibatalkan dan pengguna dapat mencoba kembali |
| Pass digunakan bersamaan | Gunakan database transaction dan locking |
| Database mengalami kerusakan | Backup terjadwal dan pengujian restore |
| Akses tidak sah | Authentication dan RBAC |
| Keterlambatan sprint | Prioritaskan fitur MVP |
| Integrasi frontend-backend gagal | Gunakan kontrak API dan dokumentasi Swagger |

---

# 14. Penutup

Sistem Informasi Buku Tamu Digital diharapkan dapat meningkatkan efektivitas pengelolaan kunjungan melalui proses digital yang terstruktur, aman, dan mudah digunakan.

Dengan menggunakan Python pada sisi backend dan TypeScript pada sisi frontend serta metode Agile Scrum, proses pengembangan diharapkan menjadi lebih terukur, kolaboratif, dan fleksibel terhadap perubahan kebutuhan.

Dokumen PRD ini menjadi acuan awal bagi seluruh anggota tim dalam proses analisis, perancangan, implementasi, pengujian, hingga deployment produk.