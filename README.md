# Sistem Informasi Buku Tamu Digital

Sistem Informasi Buku Tamu Digital berbasis website dengan backend Python (Flask REST API) dan frontend TypeScript (Next.js & Tailwind CSS) yang memfasilitasi pencatatan tamu secara real-time, verifikasi foto wajib melalui webcam browser, manajemen ketersediaan pass fisik, serta pemantauan dan laporan kunjungan institusi.

---

## 🎨 Acuan Desain Figma
- **Link Desain:** [Figma Design Canvas - Buku Tamu Digital](https://www.figma.com/design/gr5mXhJ5PwRqbeRlHc4U5o/Untitled?node-id=0-1&p=f&t=bcRTG9iSiitqg2Ty-0)
- **Dokumentasi UI/UX:** [docs/ui-ux-design.md](docs/ui-ux-design.md)
- **Palet Warna Utama:** Crimson Maroon (`#92001E`), Dark Maroon (`#650015`), Warm Ivory (`#FEF7EC`), Black Badges (`#1A1918`).

---

## 📁 Struktur Repositori

```
buku-tamu/
├── backend/
│   ├── app/
│   │   ├── models/            # Model ORM SQLAlchemy
│   │   ├── schemas/           # Skema validasi Pydantic
│   │   ├── routes/            # Blueprint REST API
│   │   ├── services/          # Logika bisnis (Checkin, Pass, Auth)
│   │   ├── repositories/      # Layer abstraksi query database
│   │   ├── middleware/        # Validasi JWT & otorisasi RBAC
│   │   └── utils/             # Helper kamera, upload file, hashing
│   ├── migrations/            # Migrasi skema database Alembic
│   ├── tests/                 # Unit & integration testing pytest
│   ├── config.py              # Konfigurasi aplikasi
│   ├── requirements.txt       # Dependensi pustaka Python
│   └── run.py                 # Runner backend Flask
│
├── frontend/
│   ├── src/
│   │   ├── app/               # Next.js App Router
│   │   ├── components/        # Komponen UI modular
│   │   ├── hooks/             # Custom React Hooks (useWebcam, useAuth)
│   │   ├── services/          # Axios HTTP Client
│   │   ├── types/             # TypeScript types
│   │   └── lib/               # Utility functions
│   └── package.json           # Dependensi pustaka TypeScript
│
├── docs/                      # Dokumentasi Proyek Sprint
│   ├── ui-ux-design.md        # Spesifikasi Desain UI/UX Figma
│   ├── erd.md                 # Entity Relationship Diagram & Indexing
│   ├── architecture.md        # Arsitektur REST API & Concurrency
│   └── product-backlog.md     # Product Backlog & Rencana Sprint 1-6
├── database.md                # Skema DDL Database PostgreSQL murni
├── prd.md                     # Product Requirements Document
└── README.md
```

---

## 🚀 Status Pengembangan (Agile Scrum)

- [x] **Sprint 1 — Analisis dan Perancangan (Selesai)**
  - PRD & Analisis Kebutuhan
  - Spesifikasi Desain UI/UX dari link Figma
  - Finalisasi ERD Relasional & PostgreSQL Schema
  - Desain Arsitektur Sistem & REST API Contracts
  - Scaffolding Struktur Proyek Backend & Frontend
  - Penyusunan Product Backlog (Sprint 1 - 6)
- [ ] **Sprint 2 — Fondasi Backend dan Frontend (Next)**
  - Setup Flask, SQLAlchemy, Alembic, Auth JWT & RBAC
  - Setup Next.js, Tailwind CSS tema Maroon/Ivory, Layout, Halaman Login

---

## 🛠️ Persyaratan Lingkungan
- Python 3.12+
- Node.js 18+ & npm / pnpm
- PostgreSQL 15+
