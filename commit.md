# Ketentuan Commit dan Push Repository

## 1. Ketentuan Umum
- Setiap perubahan pada project yang sudah selesai dikerjakan wajib di-commit dan di-push ke repository.
- Push dilakukan secara berkala, tidak menunggu seluruh fitur selesai.
- Perubahan yang di-push harus relevan dengan kebutuhan project.
- Hindari melakukan push terhadap file yang tidak diperlukan atau tidak berkaitan dengan jalannya aplikasi.
- Sebelum push, pastikan perubahan tidak menyebabkan error atau merusak fitur yang sudah berjalan.

## 2. Perubahan yang Wajib Di-Push
Perubahan berikut wajib di-commit dan di-push:

- Penambahan fitur baru.
- Perbaikan bug atau error.
- Perubahan dan penyesuaian database, termasuk migration.
- Perubahan API, backend, maupun frontend.
- Perubahan konfigurasi project yang diperlukan.
- Perbaikan UI/UX yang sudah selesai.
- Penambahan atau perubahan dokumentasi penting, seperti README dan dokumentasi API.
- Perubahan pengujian, termasuk unit test dan integration test.
- Perubahan dependency yang memang dibutuhkan project.

## 3. Perubahan yang Tidak Perlu Di-Push
Hindari melakukan push terhadap:

- File sementara atau file hasil build.
- Cache dan file log lokal.
- Folder virtual environment seperti `venv/` atau `.venv/`.
- Folder dependency seperti `node_modules/`.
- File konfigurasi lokal yang berisi informasi pribadi.
- File `.env` yang berisi password, API key, token, atau secret.
- File duplikat, file tidak terpakai, atau file eksperimen yang tidak berkaitan dengan project.

File yang tidak perlu di-push harus diatur melalui `.gitignore`.

## 4. Ketentuan Commit
- Setiap commit harus memiliki pesan yang jelas dan menggambarkan perubahan.
- Hindari pesan commit seperti `update`, `fix`, `coba`, atau `perubahan`.
- Usahakan satu commit berisi satu tujuan perubahan yang jelas.
- Jangan menggabungkan perubahan yang tidak berkaitan dalam satu commit.

Contoh format commit:

- `feat: menambahkan fitur check-in pengunjung`
- `fix: memperbaiki validasi nomor kartu`
- `refactor: merapikan struktur service`
- `docs: memperbarui dokumentasi API`
- `test: menambahkan pengujian check-out`
- `chore: memperbarui dependency`

## 5. Ketentuan Push
- Setiap perubahan yang sudah selesai dan di-commit harus segera di-push.
- Push dilakukan setelah perubahan diperiksa dan tidak mengandung error yang diketahui.
- Sebelum push, periksa status repository dan pastikan hanya file yang relevan yang akan dikirim.
- Jika terdapat perubahan dari anggota tim lain, lakukan sinkronisasi terlebih dahulu.
- Jangan melakukan force push ke branch bersama tanpa persetujuan tim.
- Jangan melakukan push langsung ke branch `main` jika tim menggunakan pull request atau branch development.

## 6. Alur Kerja
1. Kerjakan perubahan pada branch yang sesuai.
2. Periksa perubahan menggunakan `git status` dan `git diff`.
3. Jalankan pengujian yang relevan.
4. Stage file yang diperlukan.
5. Buat commit dengan pesan yang jelas.
6. Push commit ke repository.
7. Pastikan perubahan sudah muncul di GitHub.

## 7. Prinsip Utama
**Setiap perubahan yang sudah selesai, relevan, dan telah diperiksa wajib di-commit dan di-push. Jangan menumpuk perubahan terlalu lama di lokal, tetapi jangan pula melakukan push terhadap file yang tidak diperlukan atau berpotensi membahayakan repository.**
# Periksa perubahan
git status
git diff

# Stage file yang diperlukan
git add nama-file
# atau jika semua perubahan sudah diperiksa
git add .

# Commit
git commit -m "feat: menambahkan fitur check-in pengunjung"

# Push ke branch saat ini
git push

Catatan: git add . hanya digunakan setelah memastikan tidak ada file rahasia, file sementara, atau file yang tidak diperlukan. Pastikan .env sudah masuk .gitignore sebelum melakukan push.