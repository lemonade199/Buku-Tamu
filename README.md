# 🏢 Sistem Informasi Buku Tamu Digital

Sistem Informasi Buku Tamu Digital (*Digital Guest Book & Physical Pass Management System*) modern berbasis web yang dirancang untuk instansi pemerintah dan korporasi. Sistem ini mengintegrasikan pendaftaran mandiri tamu melalui Kiosk dengan verifikasi foto wajah langsung (*webcam browser*), ruang tunggu persetujuan (*waiting room & approval*) oleh resepsionis, pengelolaan siklus hidup kartu pass fisik/RFID, pemantauan real-time, hingga rekapitulasi laporan kunjungan.

---

## 🌟 Fitur Utama

### 1. Kiosk Check-in Mandiri (*Self-Service Kiosk*)
- **Pengambilan Foto Wajah Real-Time:** Integrasi webcam langsung di browser dengan konversi kompresi Base64 yang aman.
- **Pencatatan Data Kunjungan:** Pengisian nama lengkap, instansi asal, pihak yang dituju (*representing*), dan tujuan kunjungan (*purpose*).
- **Alokasi Kartu Pass:** Sistem secara otomatis memilih kartu pass fisik yang berstatus `AVAILABLE` atau memfasilitasi pemilihan manual kartu.

### 2. Ruang Tunggu & Verifikasi Resepsionis (*Waiting Room & Approval*)
- **Persetujuan Resepsionis:** Tamu yang baru mendaftar masuk ke antrean *Waiting Room* (`PENDING`).
- **Verifikasi Visual:** Resepsionis memvalidasi identitas tamu dan foto tangkapan wajah sebelum menyetujui (*Approve*) atau menolak (*Reject* disertai alasan penolakan).
- **Penyerahan Kartu Pass:** Kartu berpindah status ke `IN_USE` saat resepsionis menyerahkan kartu fisik ke tamu.

### 3. Manajemen Kartu Pass Fisik / RFID (*Pass Lifecycle Management*)
- **State Machine Terproteksi:** Siklus status yang konsisten: `AVAILABLE` $\rightarrow$ `PENDING` $\rightarrow$ `IN_USE` $\rightarrow$ `AVAILABLE`.
- **Penanganan Status Khusus:** Fitur penandaan kartu rusak (`MAINTENANCE`/`DAMAGED`) dan kartu hilang (`LOST`).
- **Anti-Race Condition:** Penguncian atomik transaksi database (`with_for_update()`) untuk mencegah alokasi ganda (*double booking*) pada kartu yang sama.

### 4. Check-out Terintegrasi
- **Scan Kartu RFID / Nomor Pass:** Tamu dapat melakukan tap pengembalian kartu di Kiosk Check-out secara mandiri.
- **Check-out Manual:** Petugas dapat melakukan check-out tamu langsung melalui tabel monitoring jika tamu lupa melakukan tap kartu saat meninggalkan gedung.

### 5. Dashboard Analitik & Monitoring Real-Time
- **Statistik Utama:** Total tamu aktif di dalam gedung, total kunjungan hari ini, ketersediaan kartu pass, dan tingkat okupansi.
- **Visualisasi Tren:** Grafik batang interaktif kunjungan per jam dan tren harian/mingguan berbasis Recharts.
- **Monitoring Pass Terfilter:** Pemantauan status kartu dengan filter rentang tanggal dinamis (*Hari ini*, *Minggu ini*, *Bulan ini*, dan *Semua*).
- **Hemat Bandwidth (Smart Polling):** Interval polling latar belakang otomatis berhenti saat tab browser diminimalkan atau tidak aktif (*visibility listener*).

### 6. Master Data & Keamanan Hak Akses (RBAC)
- **Role-Based Access Control:** Pemisahan hak akses antara `ADMIN` (akses penuh sistem & konfigurasi) dan `PETUGAS` (operasional check-in, persetujuan, dan pemantauan).
- **Otentikasi Berlapis:** JSON Web Token (JWT) dengan mekanisme *token revocation blocklist* dan *rate limiting* anti-brute force (maksimum 5 percobaan gagal per menit).
- **Proteksi Media Privasi:** Foto wajah pengunjung dan foto profil staf diproteksi penuh di balik otentikasi JWT (mencegah *unauthenticated privacy breach*).

### 7. Pengaturan Sistem, Integrasi SSO & Cadangan Basis Data
- **Identitas Institusi:** Kustomisasi nama instansi, logo, jam operasional layanan (buka/tutup), dan batas peringatan stok kartu.
- **Notifikasi & SMTP:** Integrasi email notifikasi akun baru, reset password, dan rekapitulasi berkala.
- **Single Sign-On (SSO):** Konfigurasi protokol SSO/OIDC perusahaan (Issuer, Client ID, Client Secret, dan Session Timeout).
- **Pencadangan Database:** Ekspor dan impor cadangan file SQL langsung dari antarmuka web.

---

## 🏗️ Arsitektur & Teknologi

| Komponen | Teknologi | Deskripsi |
|---|---|---|
| **Backend Framework** | **Python 3.12 / Flask 3** | RESTful API modular berbasis Blueprints |
| **ORM & Database Engine** | **SQLAlchemy 2.0 / PostgreSQL 15+** | Pemodelan relasional atomik dengan transaksi terkunci |
| **Data Validation** | **Pydantic v2** | Validasi payload request dan serialisasi respons seragam |
| **Authentication** | **Flask-JWT-Extended** | Dual-token authentication (Access Token + Refresh Token) |
| **Frontend Framework** | **Next.js 14 (App Router)** | TypeScript, React 18, Server & Client Component architecture |
| **Styling & Icons** | **Tailwind CSS & Lucide Icons** | Desain responsif bertema institusional (Crimson Maroon & Warm Ivory) |
| **Charts** | **Recharts** | Visualisasi data analitik dan grafik tren kunjungan |
| **Testing** | **Pytest** | Pengujian unit dan integrasi otomatis (100% test coverage pada alur kritis) |

---

## 📂 Struktur Repositori

```text
Buku-Tamu/
├── backend/
│   ├── app/
│   │   ├── models/            # Model ORM SQLAlchemy (entities.py, base.py)
│   │   ├── schemas/           # Skema validasi Pydantic (auth, visitor, pass, setting)
│   │   ├── routes/            # Blueprint REST API (auth, checkin, checkout, pass, settings, reports)
│   │   ├── services/          # Logika bisnis inti (Checkin, Pass, Auth, Backup)
│   │   ├── repositories/      # Layer abstraksi query database
│   │   ├── middleware/        # Validasi JWT, token blocklist, rate limiting, RBAC
│   │   └── utils/             # Helper kamera, upload file, path sanitizer, datetime UTC
│   ├── tests/                 # Unit & integration testing pytest (22 passing test cases)
│   ├── config.py              # Konfigurasi aplikasi & database connection pool
│   ├── requirements.txt       # Dependensi pustaka Python
│   ├── run.py                 # Entry point server Flask
│   └── .env.example           # Contoh variabel lingkungan backend
│
├── frontend/
│   ├── src/
│   │   ├── app/               # Next.js App Router
│   │   │   ├── (auth)/        # Halaman Login
│   │   │   ├── (dashboard)/   # Halaman Dashboard, Checkin, Checkout, Pass, Master, Reports, Settings
│   │   │   └── layout.tsx     # Root layout & navigasi sidebar
│   │   ├── components/        # Komponen UI modular (Webcam, Modal, Badges, StatCards)
│   │   ├── lib/               # Klien API terpusat (api.ts) & helper formatting
│   │   └── types/             # Definisi TypeScript interface
│   ├── package.json           # Dependensi pustaka TypeScript & Next.js
│   └── tailwind.config.ts     # Konfigurasi tema warna & styling
│
├── docs/                      # Dokumentasi teknis proyek
│   ├── ui-ux-design.md        # Spesifikasi Desain UI/UX Figma
│   ├── erd.md                 # Entity Relationship Diagram & Indexing
│   ├── architecture.md        # Arsitektur REST API & Concurrency
│   └── product-backlog.md     # Product Backlog & Rencana Sprint
├── database.md                # Skema DDL Database PostgreSQL & dokumentasi kamus data
├── prd.md                     # Product Requirements Document
└── README.md                  # Dokumentasi proyek utama
```

---

## 🚀 Panduan Instalasi & Menjalankan Proyek

### 1. Prasyarat Lingkungan
Pastikan perangkat Anda telah terpasang:
- **Python 3.12+**
- **Node.js 18+** & **npm**
- **PostgreSQL 15+**

---

### 2. Konfigurasi Basis Data PostgreSQL
Buat basis data baru di PostgreSQL:
```sql
CREATE DATABASE buku_tamu WITH ENCODING = 'UTF8';
```
*(Opsional)* Anda dapat mengimpor skema DDL dan data awal menggunakan file [database.md](database.md) atau biarkan backend menginisialisasi tabel secara otomatis melalui model SQLAlchemy saat pertama kali dijalankan.

---

### 3. Setup & Menjalankan Backend (Flask API)

1. Masuk ke direktori backend:
   ```bash
   cd backend
   ```
2. Buat dan aktifkan *virtual environment*:
   ```bash
   # Windows (PowerShell)
   python -m venv .venv
   .venv\Scripts\Activate.ps1

   # Linux / macOS
   python3 -m venv .venv
   source .venv/bin/activate
   ```
3. Pasang seluruh dependensi:
   ```bash
   pip install -r requirements.txt
   ```
4. Buat file `.env` (salin dari `.env.example`) dan sesuaikan kredensial database Anda:
   ```env
   FLASK_ENV=development
   SECRET_KEY=kunci-rahasia-aplikasi-anda
   JWT_SECRET_KEY=jwt-secret-key-minimal-32-karakter-harus-panjang-dan-aman

   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=buku_tamu
   DB_USER=postgres
   DB_PASSWORD=password_postgres_anda

   JWT_ACCESS_TOKEN_EXPIRY=900
   JWT_REFRESH_TOKEN_EXPIRY=604800
   UPLOAD_FOLDER=./storage/photos
   ```
5. Jalankan server backend:
   ```bash
   python run.py
   ```
   *Backend akan aktif di `http://127.0.0.1:5000` (atau port yang ditentukan).*
   *Dokumentasi interaktif **Swagger UI** dapat diakses langsung melalui browser di: `http://127.0.0.1:5000/apidocs/`*

---

### 4. Setup & Menjalankan Frontend (Next.js)

1. Buka terminal baru dan masuk ke direktori frontend:
   ```bash
   cd frontend
   ```
2. Pasang seluruh paket dependensi:
   ```bash
   npm install
   ```
3. Jalankan server pengembangan:
   ```bash
   npm run dev
   ```
   *Frontend dapat diakses melalui browser di `http://localhost:3000`.*

---

## 🔑 Kredensial Akun Bawaan (*Default Seed Accounts*)

Untuk pengujian awal, sistem telah menyediakan akun pengguna default:

| Role | Username | Password Default | Hak Akses |
|---|---|---|---|
| **Administrator** | `admin` | `admin123` | Akses penuh: Master data, kelola user, pengaturan institusi, SSO, backup database |
| **Petugas Resepsinis** | `petugas` | `petugas123` | Operasional: Kiosk check-in, persetujuan antrean tamu, check-out, monitoring kartu |

> [!IMPORTANT]
> Sangat disarankan untuk segera mengganti kata sandi akun default di atas melalui menu **Pengaturan Profil** sebelum sistem digunakan di lingkungan produksi.

---

## 🧪 Pengujian & Verifikasi Kualitas (*Quality Assurance*)

Proyek ini dilengkapi dengan rangkaian pengujian unit dan integrasi otomatis:

### Menjalankan Pengujian Backend:
```bash
# Dari root project
backend\.venv\Scripts\pytest -q
```
*Seluruh 22 skenario pengujian (otentikasi, approval, persetujuan kartu, rate limiting, check-in, check-out) terverifikasi lulus tanpa peringatan.*

### Menjalankan Pengujian Build Frontend:
```bash
cd frontend
npm run build
```
*Kompilasi TypeScript Next.js 14 menghasilkan 13 halaman statis yang teroptimasi tanpa galat tipe data (*zero type errors*).*

---

## 🎨 Acuan Desain & Palet Warna (Figma)

- **Canvas Desain:** [Figma Design Canvas - Buku Tamu Digital](https://www.figma.com/design/gr5mXhJ5PwRqbeRlHc4U5o/Untitled?node-id=0-1&p=f&t=bcRTG9iSiitqg2Ty-0)
- **Palet Warna Utama:**
  - **Crimson Maroon:** `#92001E` (Warna aksen utama, tombol primer, header aktif)
  - **Dark Maroon:** `#650015` (Status badge, gradien hero)
  - **Warm Ivory:** `#FEF7EC` (Latar belakang formulir Kiosk)
  - **Dark Badges / Neutral:** `#1A1918` (Kartu kontras tinggi)

---

## 📄 Lisensi
Sistem Informasi Buku Tamu Digital didistribusikan untuk keperluan operasional kedinasan dan internal institusi. Hak Cipta dilindungi undang-undang.
