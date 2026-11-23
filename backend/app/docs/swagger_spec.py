"""
OpenAPI 2.0 / Swagger UI Specification for Buku Tamu Digital REST API.
"""

SWAGGER_CONFIG = {
    "headers": [],
    "specs": [
        {
            "endpoint": "apispec_1",
            "route": "/apispec_1.json",
            "rule_filter": lambda rule: True,
            "model_filter": lambda tag: True,
        }
    ],
    "static_url_path": "/flasgger_static",
    "swagger_ui": True,
    "specs_route": "/apidocs/",
    "title": "Buku Tamu Digital API Documentation",
    "uiversion": 3,
}

SWAGGER_TEMPLATE = {
    "swagger": "2.0",
    "info": {
        "title": "Sistem Informasi Buku Tamu Digital API",
        "description": (
            "Dokumentasi resmi RESTful API untuk Sistem Informasi Buku Tamu Digital dan Manajemen Kartu Pass.\n\n"
            "### Panduan Otentikasi:\n"
            "1. Lakukan login melalui endpoint `POST /api/v1/auth/login` menggunakan username dan kata sandi.\n"
            "2. Salin nilai `access_token` dari respons JSON.\n"
            "3. Klik tombol **Authorize** di kanan atas Swagger UI, lalu masukkan: `Bearer <access_token>`.\n"
            "4. Seluruh endpoint terproteksi siap untuk diuji langsung."
        ),
        "version": "1.0.0",
        "contact": {
            "name": "Tim IT & Administrator Sistem",
            "email": "admin@bukutamu.local"
        }
    },
    "host": "localhost:5000",
    "basePath": "/",
    "schemes": ["http", "https"],
    "securityDefinitions": {
        "Bearer": {
            "type": "apiKey",
            "name": "Authorization",
            "in": "header",
            "description": "JWT Authorization header menggunakan skema Bearer. Contoh: 'Bearer eyJhbGciOi...'"
        }
    },
    "tags": [
        {"name": "Autentikasi & Akun", "description": "Login, refresh token, profil, dan manajemen akun staf (RBAC)"},
        {"name": "Pengunjung & Check-in", "description": "Pendaftaran Kiosk mandiri, antrean permohonan, approval, check-out, dan ekspor"},
        {"name": "Kartu Pass Fisik", "description": "Inventaris kartu pass, status rak fisik, dan monitoring ketersediaan"},
        {"name": "Dashboard & Metrik", "description": "Statistik real-time, tingkat okupansi, dan grafik tren kunjungan"},
        {"name": "Pengaturan & Cadangan", "description": "Identitas instansi, SMTP email, SSO, dan backup/restore basis data"},
        {"name": "Sistem", "description": "Health check dan status operasional service"}
    ],
    "paths": {
        "/api/health": {
            "get": {
                "tags": ["Sistem"],
                "summary": "Health check service API",
                "description": "Memeriksa apakah server backend berjalan normal.",
                "responses": {
                    "200": {
                        "description": "Layanan aktif dan berjalan normal",
                        "schema": {
                            "type": "object",
                            "properties": {
                                "status": {"type": "string", "example": "ok"},
                                "app": {"type": "string", "example": "Buku Tamu Digital API"},
                                "version": {"type": "string", "example": "1.0.0"}
                            }
                        }
                    }
                }
            }
        },
        "/api/v1/auth/login": {
            "post": {
                "tags": ["Autentikasi & Akun"],
                "summary": "Login staf / administrator",
                "description": "Mengautentikasi pengguna menggunakan username dan kata sandi untuk memperoleh JWT access token dan refresh token. Dilengkapi rate limiting.",
                "parameters": [
                    {
                        "name": "body",
                        "in": "body",
                        "required": True,
                        "schema": {
                            "type": "object",
                            "required": ["username", "password"],
                            "properties": {
                                "username": {"type": "string", "example": "admin"},
                                "password": {"type": "string", "example": "Admin123!"}
                            }
                        }
                    }
                ],
                "responses": {
                    "200": {"description": "Login berhasil, access token & user profile dikembalikan"},
                    "401": {"description": "Kredensial tidak valid"},
                    "429": {"description": "Terlalu banyak percobaan login gagal (Rate limited)"}
                }
            }
        },
        "/api/v1/auth/refresh": {
            "post": {
                "tags": ["Autentikasi & Akun"],
                "summary": "Memperbarui JWT Access Token",
                "description": "Menerbitkan access token baru menggunakan refresh token yang masih aktif.",
                "parameters": [
                    {
                        "name": "body",
                        "in": "body",
                        "required": True,
                        "schema": {
                            "type": "object",
                            "required": ["refresh_token"],
                            "properties": {
                                "refresh_token": {"type": "string", "example": "urlsafe_random_token_string"}
                            }
                        }
                    }
                ],
                "responses": {
                    "200": {"description": "Access token baru berhasil diterbitkan"},
                    "401": {"description": "Refresh token tidak valid atau kadaluwarsa"}
                }
            }
        },
        "/api/v1/auth/logout": {
            "post": {
                "tags": ["Autentikasi & Akun"],
                "summary": "Logout & pencabutan refresh token",
                "description": "Mencabut status aktif refresh token pengguna di basis data.",
                "parameters": [
                    {
                        "name": "body",
                        "in": "body",
                        "required": False,
                        "schema": {
                            "type": "object",
                            "properties": {
                                "refresh_token": {"type": "string"}
                            }
                        }
                    }
                ],
                "responses": {
                    "200": {"description": "Logout berhasil"}
                }
            }
        },
        "/api/v1/auth/me": {
            "get": {
                "tags": ["Autentikasi & Akun"],
                "summary": "Informasi pengguna yang sedang login",
                "security": [{"Bearer": []}],
                "responses": {
                    "200": {"description": "Data profil akun aktif"},
                    "401": {"description": "Token tidak valid atau belum login"}
                }
            }
        },
        "/api/v1/auth/profile": {
            "put": {
                "tags": ["Autentikasi & Akun"],
                "summary": "Perbarui profil akun pengguna sendiri",
                "security": [{"Bearer": []}],
                "parameters": [
                    {
                        "name": "body",
                        "in": "body",
                        "required": True,
                        "schema": {
                            "type": "object",
                            "required": ["fullname", "username", "email"],
                            "properties": {
                                "fullname": {"type": "string", "example": "Budi Rahardjo"},
                                "username": {"type": "string", "example": "budi_r"},
                                "email": {"type": "string", "example": "budi@instansi.go.id"},
                                "telephone": {"type": "string", "example": "081234567890"},
                                "avatar": {"type": "string", "description": "Data gambar avatar format base64"}
                            }
                        }
                    }
                ],
                "responses": {
                    "200": {"description": "Profil berhasil diperbarui"},
                    "409": {"description": "Username atau email sudah digunakan akun lain"}
                }
            }
        },
        "/api/v1/auth/password": {
            "put": {
                "tags": ["Autentikasi & Akun"],
                "summary": "Ganti kata sandi akun sendiri",
                "security": [{"Bearer": []}],
                "parameters": [
                    {
                        "name": "body",
                        "in": "body",
                        "required": True,
                        "schema": {
                            "type": "object",
                            "required": ["old_password", "new_password"],
                            "properties": {
                                "old_password": {"type": "string", "example": "PasswordLama123!"},
                                "new_password": {"type": "string", "example": "PasswordBaru123!"}
                            }
                        }
                    }
                ],
                "responses": {
                    "200": {"description": "Kata sandi berhasil diperbarui"},
                    "400": {"description": "Kata sandi lama tidak cocok"}
                }
            }
        },
        "/api/v1/auth/users": {
            "get": {
                "tags": ["Autentikasi & Akun"],
                "summary": "Daftar seluruh akun pengguna (Admin)",
                "security": [{"Bearer": []}],
                "responses": {
                    "200": {"description": "Daftar pengguna berhasil diambil"},
                    "403": {"description": "Akses ditolak: Hanya role ADMIN"}
                }
            },
            "post": {
                "tags": ["Autentikasi & Akun"],
                "summary": "Buat akun pengguna baru (Admin)",
                "security": [{"Bearer": []}],
                "parameters": [
                    {
                        "name": "body",
                        "in": "body",
                        "required": True,
                        "schema": {
                            "type": "object",
                            "required": ["fullname", "username", "email", "role_code"],
                            "properties": {
                                "fullname": {"type": "string", "example": "Siti Aminah"},
                                "username": {"type": "string", "example": "siti"},
                                "email": {"type": "string", "example": "siti@instansi.go.id"},
                                "telephone": {"type": "string", "example": "081299998888"},
                                "password": {"type": "string", "example": "Petugas123!"},
                                "role_code": {"type": "string", "enum": ["ADMIN", "PETUGAS"], "example": "PETUGAS"}
                            }
                        }
                    }
                ],
                "responses": {
                    "201": {"description": "Pengguna baru berhasil dibuat"},
                    "409": {"description": "Username atau email sudah digunakan"}
                }
            }
        },
        "/api/v1/auth/users/{user_id}": {
            "put": {
                "tags": ["Autentikasi & Akun"],
                "summary": "Perbarui data akun pengguna oleh Admin",
                "security": [{"Bearer": []}],
                "parameters": [
                    {"name": "user_id", "in": "path", "type": "integer", "required": True},
                    {
                        "name": "body",
                        "in": "body",
                        "required": True,
                        "schema": {
                            "type": "object",
                            "properties": {
                                "fullname": {"type": "string"},
                                "username": {"type": "string"},
                                "email": {"type": "string"},
                                "telephone": {"type": "string"},
                                "role_code": {"type": "string", "enum": ["ADMIN", "PETUGAS"]},
                                "is_active": {"type": "boolean"}
                            }
                        }
                    }
                ],
                "responses": {
                    "200": {"description": "Data pengguna berhasil diperbarui"},
                    "404": {"description": "Pengguna tidak ditemukan"}
                }
            }
        },
        "/api/v1/auth/users/{user_id}/toggle-active": {
            "patch": {
                "tags": ["Autentikasi & Akun"],
                "summary": "Aktifkan atau nonaktifkan akun pengguna (Admin)",
                "security": [{"Bearer": []}],
                "parameters": [
                    {"name": "user_id", "in": "path", "type": "integer", "required": True}
                ],
                "responses": {
                    "200": {"description": "Status keaktifan akun berhasil diubah"}
                }
            }
        },
        "/api/v1/auth/users/{user_id}/reset-password": {
            "post": {
                "tags": ["Autentikasi & Akun"],
                "summary": "Reset kata sandi pengguna oleh Admin",
                "security": [{"Bearer": []}],
                "parameters": [
                    {"name": "user_id", "in": "path", "type": "integer", "required": True},
                    {
                        "name": "body",
                        "in": "body",
                        "required": False,
                        "schema": {
                            "type": "object",
                            "properties": {
                                "password": {"type": "string", "example": "PasswordBaru123!"}
                            }
                        }
                    }
                ],
                "responses": {
                    "200": {"description": "Kata sandi pengguna berhasil direset"}
                }
            }
        },
        "/api/v1/auth/users/{user_id}/avatar": {
            "get": {
                "tags": ["Autentikasi & Akun"],
                "summary": "Ambil file gambar avatar staf",
                "security": [{"Bearer": []}],
                "parameters": [
                    {"name": "user_id", "in": "path", "type": "integer", "required": True},
                    {"name": "token", "in": "query", "type": "string", "description": "Token JWT opsional untuk tag <img>"}
                ],
                "produces": ["image/jpeg", "image/png"],
                "responses": {
                    "200": {"description": "File gambar avatar"},
                    "404": {"description": "Avatar tidak ditemukan"}
                }
            }
        },
        "/api/v1/visitors/checkin": {
            "post": {
                "tags": ["Pengunjung & Check-in"],
                "summary": "Registrasi mandiri tamu di Kiosk",
                "description": "Pengunjung mendaftarkan diri dengan foto wajah webcam. Kartu pass fisik otomatis dialokasikan dan status menjadi PENDING menunggu persetujuan resepsionis. Terproteksi rate limiting.",
                "parameters": [
                    {
                        "name": "body",
                        "in": "body",
                        "required": True,
                        "schema": {
                            "type": "object",
                            "required": ["fullname", "photo_base64"],
                            "properties": {
                                "fullname": {"type": "string", "example": "Ahmad Dahlan"},
                                "institution": {"type": "string", "example": "PT Sinergi Nusantara"},
                                "representing": {"type": "string", "example": "Direktur IT"},
                                "purpose": {"type": "string", "example": "Konsultasi teknis integrasi sistem"},
                                "no_pass": {"type": "string", "example": "PASS-01", "description": "Nomor pass opsional (jika memilih kartu manual)"},
                                "photo_base64": {"type": "string", "description": "Foto wajah format data:image/jpeg;base64,..."}
                            }
                        }
                    }
                ],
                "responses": {
                    "201": {"description": "Permohonan registrasi berhasil diajukan (Status: PENDING)"},
                    "400": {"description": "Kartu pass sedang tidak tersedia"},
                    "422": {"description": "Foto tidak valid atau formulir tidak lengkap"},
                    "429": {"description": "Terlalu banyak permintaan check-in (Rate limit)"}
                }
            }
        },
        "/api/v1/visitors/pending": {
            "get": {
                "tags": ["Pengunjung & Check-in"],
                "summary": "Daftar antrean tamu di ruang tunggu (Pending Approval)",
                "security": [{"Bearer": []}],
                "responses": {
                    "200": {"description": "Daftar tamu yang sedang menunggu konfirmasi"}
                }
            }
        },
        "/api/v1/visitors/{id_visitor}/approve": {
            "post": {
                "tags": ["Pengunjung & Check-in"],
                "summary": "Setujui registrasi tamu & serahkan kartu pass",
                "security": [{"Bearer": []}],
                "parameters": [
                    {"name": "id_visitor", "in": "path", "type": "integer", "required": True}
                ],
                "responses": {
                    "200": {"description": "Tamu disetujui, kartu pass beralih ke status IN_USE"},
                    "400": {"description": "Tamu sudah diproses sebelumnya"}
                }
            }
        },
        "/api/v1/visitors/{id_visitor}/reject": {
            "post": {
                "tags": ["Pengunjung & Check-in"],
                "summary": "Tolak registrasi tamu dengan alasan",
                "security": [{"Bearer": []}],
                "parameters": [
                    {"name": "id_visitor", "in": "path", "type": "integer", "required": True},
                    {
                        "name": "body",
                        "in": "body",
                        "required": True,
                        "schema": {
                            "type": "object",
                            "required": ["reason"],
                            "properties": {
                                "reason": {"type": "string", "example": "Pejabat yang dituju sedang dinas luar kota"}
                            }
                        }
                    }
                ],
                "responses": {
                    "200": {"description": "Registrasi ditolak, kartu pass dikembalikan ke status AVAILABLE"}
                }
            }
        },
        "/api/v1/visitors/active": {
            "get": {
                "tags": ["Pengunjung & Check-in"],
                "summary": "Daftar tamu aktif di dalam gedung",
                "security": [{"Bearer": []}],
                "responses": {
                    "200": {"description": "Daftar tamu yang belum melakukan check-out"}
                }
            }
        },
        "/api/v1/visitors": {
            "get": {
                "tags": ["Pengunjung & Check-in"],
                "summary": "Daftar riwayat kunjungan tamu dengan filter & paginasi",
                "security": [{"Bearer": []}],
                "parameters": [
                    {"name": "page", "in": "query", "type": "integer", "default": 1},
                    {"name": "per_page", "in": "query", "type": "integer", "default": 10},
                    {"name": "search", "in": "query", "type": "string", "description": "Pencarian nama, instansi, atau keperluan"},
                    {"name": "status", "in": "query", "type": "string", "enum": ["ACTIVE", "COMPLETED", "PENDING", "REJECTED"]},
                    {"name": "start_date", "in": "query", "type": "string", "description": "Format YYYY-MM-DD"},
                    {"name": "end_date", "in": "query", "type": "string", "description": "Format YYYY-MM-DD"}
                ],
                "responses": {
                    "200": {"description": "Daftar kunjungan dengan metadata paginasi"}
                }
            }
        },
        "/api/v1/visitors/{id_visitor}": {
            "get": {
                "tags": ["Pengunjung & Check-in"],
                "summary": "Detail informasi satu kunjungan tamu",
                "security": [{"Bearer": []}],
                "parameters": [
                    {"name": "id_visitor", "in": "path", "type": "integer", "required": True}
                ],
                "responses": {
                    "200": {"description": "Data lengkap kunjungan tamu"},
                    "404": {"description": "Pengunjung tidak ditemukan"}
                }
            }
        },
        "/api/v1/visitors/{id_visitor}/photo": {
            "get": {
                "tags": ["Pengunjung & Check-in"],
                "summary": "Ambil file foto wajah pengunjung (Terproteksi)",
                "security": [{"Bearer": []}],
                "parameters": [
                    {"name": "id_visitor", "in": "path", "type": "integer", "required": True},
                    {"name": "token", "in": "query", "type": "string", "description": "JWT token opsional jika diakses via tag <img>"}
                ],
                "produces": ["image/jpeg"],
                "responses": {
                    "200": {"description": "File gambar foto wajah pengunjung"},
                    "401": {"description": "Akses ditolak: Wajib token otentikasi"}
                }
            }
        },
        "/api/v1/visitors/checkout": {
            "post": {
                "tags": ["Pengunjung & Check-in"],
                "summary": "Check-out tamu via nomor pass / RFID",
                "security": [{"Bearer": []}],
                "parameters": [
                    {
                        "name": "body",
                        "in": "body",
                        "required": True,
                        "schema": {
                            "type": "object",
                            "properties": {
                                "no_pass": {"type": "string", "example": "PASS-01"},
                                "notes": {"type": "string", "example": "Tamu pulang dalam keadaan tertib"}
                            }
                        }
                    }
                ],
                "responses": {
                    "200": {"description": "Check-out berhasil, kartu pass dikembalikan ke AVAILABLE"}
                }
            }
        },
        "/api/v1/visitors/{id_visitor}/checkout": {
            "post": {
                "tags": ["Pengunjung & Check-in"],
                "summary": "Check-out tamu manual berdasarkan ID pengunjung",
                "security": [{"Bearer": []}],
                "parameters": [
                    {"name": "id_visitor", "in": "path", "type": "integer", "required": True},
                    {
                        "name": "body",
                        "in": "body",
                        "required": False,
                        "schema": {
                            "type": "object",
                            "properties": {
                                "notes": {"type": "string"}
                            }
                        }
                    }
                ],
                "responses": {
                    "200": {"description": "Check-out berhasil"}
                }
            }
        },
        "/api/v1/visitors/export/excel": {
            "get": {
                "tags": ["Pengunjung & Check-in"],
                "summary": "Unduh rekapitulasi laporan kunjungan (Excel .xlsx)",
                "security": [{"Bearer": []}],
                "parameters": [
                    {"name": "search", "in": "query", "type": "string"},
                    {"name": "status", "in": "query", "type": "string"},
                    {"name": "start_date", "in": "query", "type": "string"},
                    {"name": "end_date", "in": "query", "type": "string"}
                ],
                "produces": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
                "responses": {
                    "200": {"description": "File binary spreadsheet Excel"}
                }
            }
        },
        "/api/v1/visitors/export/pdf": {
            "get": {
                "tags": ["Pengunjung & Check-in"],
                "summary": "Unduh rekapitulasi laporan kunjungan (Dokumen PDF)",
                "security": [{"Bearer": []}],
                "parameters": [
                    {"name": "search", "in": "query", "type": "string"},
                    {"name": "status", "in": "query", "type": "string"},
                    {"name": "start_date", "in": "query", "type": "string"},
                    {"name": "end_date", "in": "query", "type": "string"}
                ],
                "produces": ["application/pdf"],
                "responses": {
                    "200": {"description": "File binary dokumen PDF"}
                }
            }
        },
        "/api/v1/pass": {
            "get": {
                "tags": ["Kartu Pass Fisik"],
                "summary": "Daftar inventaris kartu pass fisik",
                "security": [{"Bearer": []}],
                "parameters": [
                    {"name": "status", "in": "query", "type": "string", "enum": ["AVAILABLE", "PENDING", "IN_USE", "MAINTENANCE", "LOST", "INACTIVE"]}
                ],
                "responses": {
                    "200": {"description": "Daftar kartu pass"}
                }
            },
            "post": {
                "tags": ["Kartu Pass Fisik"],
                "summary": "Daftarkan kartu pass baru (Admin)",
                "security": [{"Bearer": []}],
                "parameters": [
                    {
                        "name": "body",
                        "in": "body",
                        "required": True,
                        "schema": {
                            "type": "object",
                            "required": ["no_pass"],
                            "properties": {
                                "no_pass": {"type": "string", "example": "PASS-11"},
                                "slot": {"type": "string", "example": "Rak B - Slot 6"},
                                "status": {"type": "string", "enum": ["AVAILABLE", "INACTIVE"], "default": "AVAILABLE"}
                            }
                        }
                    }
                ],
                "responses": {
                    "201": {"description": "Kartu pass baru berhasil ditambahkan"},
                    "409": {"description": "Nomor kartu pass sudah terdaftar"}
                }
            }
        },
        "/api/v1/pass/available": {
            "get": {
                "tags": ["Kartu Pass Fisik"],
                "summary": "Daftar kartu pass yang berstatus AVAILABLE (Siap Pakai)",
                "responses": {
                    "200": {"description": "Daftar kartu yang dapat dipilih di Kiosk"}
                }
            }
        },
        "/api/v1/pass/rack": {
            "get": {
                "tags": ["Kartu Pass Fisik"],
                "summary": "Visualisasi kartu pass pada rak fisik",
                "security": [{"Bearer": []}],
                "responses": {
                    "200": {"description": "Peta visual status kartu pass di rak"}
                }
            }
        },
        "/api/v1/pass/monitoring": {
            "get": {
                "tags": ["Kartu Pass Fisik"],
                "summary": "Data monitoring komprehensif kartu pass",
                "security": [{"Bearer": []}],
                "parameters": [
                    {"name": "search", "in": "query", "type": "string"},
                    {"name": "status", "in": "query", "type": "string"}
                ],
                "responses": {
                    "200": {"description": "Data status kartu pass dan pemegang aktif"}
                }
            }
        },
        "/api/v1/pass/{id_pass}": {
            "put": {
                "tags": ["Kartu Pass Fisik"],
                "summary": "Perbarui nomor kartu atau lokasi slot (Admin)",
                "security": [{"Bearer": []}],
                "parameters": [
                    {"name": "id_pass", "in": "path", "type": "integer", "required": True},
                    {
                        "name": "body",
                        "in": "body",
                        "required": True,
                        "schema": {
                            "type": "object",
                            "properties": {
                                "no_pass": {"type": "string"},
                                "slot": {"type": "string"}
                            }
                        }
                    }
                ],
                "responses": {
                    "200": {"description": "Data kartu pass berhasil diperbarui"}
                }
            }
        },
        "/api/v1/pass/{id_pass}/status": {
            "put": {
                "tags": ["Kartu Pass Fisik"],
                "summary": "Ubah status kartu pass",
                "security": [{"Bearer": []}],
                "parameters": [
                    {"name": "id_pass", "in": "path", "type": "integer", "required": True},
                    {
                        "name": "body",
                        "in": "body",
                        "required": True,
                        "schema": {
                            "type": "object",
                            "required": ["status"],
                            "properties": {
                                "status": {"type": "string", "enum": ["AVAILABLE", "IN_USE", "MAINTENANCE", "LOST", "INACTIVE"]},
                                "notes": {"type": "string"}
                            }
                        }
                    }
                ],
                "responses": {
                    "200": {"description": "Status kartu pass berhasil diubah"}
                }
            }
        },
        "/api/v1/dashboard/metrics": {
            "get": {
                "tags": ["Dashboard & Metrik"],
                "summary": "Statistik real-time dashboard & grafik tren kunjungan",
                "security": [{"Bearer": []}],
                "responses": {
                    "200": {
                        "description": "Metrik kunjungan hari ini, tamu aktif, ketersediaan kartu, dan grafik per jam"
                    }
                }
            }
        },
        "/api/v1/settings": {
            "get": {
                "tags": ["Pengaturan & Cadangan"],
                "summary": "Ambil konfigurasi sistem & institusi (Admin)",
                "security": [{"Bearer": []}],
                "responses": {
                    "200": {"description": "Data pengaturan institusi, SMTP, SSO, dan backup"}
                }
            },
            "put": {
                "tags": ["Pengaturan & Cadangan"],
                "summary": "Perbarui konfigurasi institusi, SMTP, SSO (Admin)",
                "security": [{"Bearer": []}],
                "parameters": [
                    {
                        "name": "body",
                        "in": "body",
                        "required": True,
                        "schema": {
                            "type": "object",
                            "properties": {
                                "institution_name": {"type": "string", "example": "Kementerian Keuangan RI"},
                                "opening_time": {"type": "string", "example": "07:30"},
                                "closing_time": {"type": "string", "example": "16:00"},
                                "pass_warning_limit": {"type": "integer", "example": 5},
                                "smtp_host": {"type": "string", "example": "smtp.mailtrap.io"},
                                "smtp_port": {"type": "integer", "example": 587},
                                "smtp_username": {"type": "string"},
                                "smtp_encryption": {"type": "string", "enum": ["none", "ssl", "tls"]},
                                "sso_enabled": {"type": "boolean"},
                                "sso_issuer": {"type": "string"},
                                "sso_client_id": {"type": "string"}
                            }
                        }
                    }
                ],
                "responses": {
                    "200": {"description": "Pengaturan sistem berhasil disimpan"}
                }
            }
        },
        "/api/v1/settings/logo": {
            "post": {
                "tags": ["Pengaturan & Cadangan"],
                "summary": "Unggah logo resmi institusi (Admin)",
                "security": [{"Bearer": []}],
                "parameters": [
                    {
                        "name": "body",
                        "in": "body",
                        "required": True,
                        "schema": {
                            "type": "object",
                            "required": ["logo"],
                            "properties": {
                                "logo": {"type": "string", "description": "Gambar logo dalam format base64"}
                            }
                        }
                    }
                ],
                "responses": {
                    "200": {"description": "Logo institusi berhasil diperbarui"}
                }
            }
        },
        "/api/v1/settings/logo/{filename}": {
            "get": {
                "tags": ["Pengaturan & Cadangan"],
                "summary": "Ambil file logo instansi publik",
                "description": "Menyajikan file logo instansi. Hanya mengizinkan file logo resmi berawalan prefix logo_.",
                "parameters": [
                    {"name": "filename", "in": "path", "type": "string", "required": True}
                ],
                "produces": ["image/jpeg", "image/png"],
                "responses": {
                    "200": {"description": "File gambar logo"},
                    "403": {"description": "Akses ditolak: File bukan logo institusi"},
                    "404": {"description": "File tidak ditemukan"}
                }
            }
        },
        "/api/v1/settings/smtp/test": {
            "post": {
                "tags": ["Pengaturan & Cadangan"],
                "summary": "Uji coba koneksi & pengiriman email SMTP",
                "security": [{"Bearer": []}],
                "parameters": [
                    {
                        "name": "body",
                        "in": "body",
                        "required": True,
                        "schema": {
                            "type": "object",
                            "required": ["recipient_email"],
                            "properties": {
                                "recipient_email": {"type": "string", "example": "tester@example.com"}
                            }
                        }
                    }
                ],
                "responses": {
                    "200": {"description": "Koneksi SMTP berhasil dan email uji coba terkirim"}
                }
            }
        },
        "/api/v1/settings/backup": {
            "post": {
                "tags": ["Pengaturan & Cadangan"],
                "summary": "Buat cadangan basis data baru (Admin)",
                "security": [{"Bearer": []}],
                "responses": {
                    "201": {"description": "File cadangan JSON berhasil dibuat"}
                }
            }
        },
        "/api/v1/settings/backups": {
            "get": {
                "tags": ["Pengaturan & Cadangan"],
                "summary": "Daftar seluruh file cadangan basis data (Admin)",
                "security": [{"Bearer": []}],
                "responses": {
                    "200": {"description": "Riwayat file cadangan"}
                }
            }
        },
        "/api/v1/settings/backup/download/{filename}": {
            "get": {
                "tags": ["Pengaturan & Cadangan"],
                "summary": "Unduh file cadangan basis data (Admin)",
                "security": [{"Bearer": []}],
                "parameters": [
                    {"name": "filename", "in": "path", "type": "string", "required": True}
                ],
                "produces": ["application/json"],
                "responses": {
                    "200": {"description": "File cadangan JSON"}
                }
            }
        },
        "/api/v1/settings/backup/{filename}": {
            "delete": {
                "tags": ["Pengaturan & Cadangan"],
                "summary": "Hapus file cadangan basis data (Admin)",
                "security": [{"Bearer": []}],
                "parameters": [
                    {"name": "filename", "in": "path", "type": "string", "required": True}
                ],
                "responses": {
                    "200": {"description": "File cadangan berhasil dihapus"}
                }
            }
        },
        "/api/v1/settings/restore": {
            "post": {
                "tags": ["Pengaturan & Cadangan"],
                "summary": "Pulihkan basis data dari cadangan JSON (Admin)",
                "security": [{"Bearer": []}],
                "parameters": [
                    {
                        "name": "body",
                        "in": "body",
                        "required": True,
                        "schema": {
                            "type": "object",
                            "properties": {
                                "meta": {"type": "object"},
                                "data": {"type": "object"}
                            }
                        }
                    }
                ],
                "responses": {
                    "200": {"description": "Basis data berhasil dipulihkan"}
                }
            }
        }
    }
}
