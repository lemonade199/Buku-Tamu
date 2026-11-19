# Panduan Deployment Production — Buku Tamu Digital

Panduan ini menjelaskan arsitektur deployment aplikasi Sistem Buku Tamu Digital untuk environment production.

---

## 1. Kebutuhan Sistem & Spesifikasi
- **Sistem Operasi:** Linux Ubuntu 22.04 LTS / Debian 12 / Windows Server 2022
- **Backend:** Python 3.10+ / 3.11+ / 3.12+
- **Frontend:** Node.js 18.x / 20.x LTS
- **Database:** PostgreSQL 14+ / 15+ / 16+ (Local SQLite dapat digunakan untuk evaluasi)
- **Web Server & Reverse Proxy:** NGINX dengan konfigurasi SSL/HTTPS

---

## 2. Arsitektur Deployment

```
[ Client Browser / Tablet Kiosk ]
               │ HTTPS (Port 443)
               ▼
       [ NGINX Reverse Proxy ]
        ├── /api/*   ──────► [ Gunicorn / Waitress WSGI ] (Flask Backend :5000)
        │                             │
        │                             ▼
        │                     [ PostgreSQL Database ]
        │
        └── /*       ──────► [ Next.js Node Server ] (Frontend :3000)
```

---

## 3. Konfigurasi Backend (Flask Production WSGI)

### 3.1. Environment Variables (`backend/.env`)
```bash
FLASK_ENV=production
DATABASE_URL=postgresql+psycopg2://bukutamu_user:StrongPassword123!@localhost:5432/buku_tamu
JWT_SECRET_KEY=9f83a45c7b91d2837f4019a7e6b2c8d5a1f2e3d4c5b6a7b8c9d0e1f2a3b4c5d6
UPLOAD_FOLDER=storage/photos
BACKUP_FOLDER=storage/backups
PORT=5000
```

### 3.2. Menjalankan Backend dengan Gunicorn (Linux)
```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt
pip install gunicorn

# Jalankan dengan 4 worker proses
gunicorn -w 4 -b 127.0.0.1:5000 run:app
```

---

## 4. Konfigurasi Frontend (Next.js Production Build)

### 4.1. Environment Variables (`frontend/.env.production`)
```bash
NEXT_PUBLIC_API_URL=https://bukutamu.instansi.go.id/api/v1
```

### 4.2. Build & Start Next.js
```bash
cd frontend
npm ci
npm run build

# Menjalankan Next.js menggunakan PM2 daemon manager
pm2 start npm --name "bukutamu-frontend" -- start -- -p 3000
pm2 save
```

---

## 5. Konfigurasi NGINX & SSL (HTTPS)

```nginx
server {
    listen 80;
    server_name bukutamu.instansi.go.id;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name bukutamu.instansi.go.id;

    ssl_certificate /etc/letsencrypt/live/bukutamu.instansi.go.id/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bukutamu.instansi.go.id/privkey.pem;

    client_max_body_size 25M;

    # API Backend Reverse Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 6. Prosedur Backup & Disaster Recovery
1. **Otomatis:** Sistem memiliki fitur penjadwalan cadangan harian yang menghasilkan file snapshot JSON terkompresi di `storage/backups/`.
2. **Manual:** Administrator dapat mengunduh cadangan kapan saja melalui menu **Pengaturan > Data & Cadangan Sistem > Cadangkan Sekarang**.
3. **Pemulihan (Restore):** Administrator dapat mengunggah file cadangan atau memilih salinan sebelumnya untuk pemulihan instan.
