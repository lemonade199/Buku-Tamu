import { z } from 'zod';

// Semua isian form tamu wajib diisi. Batas panjang mengikuti CheckinRequest di backend (backend/app/schemas/visitor.py).
const requiredText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} wajib diisi.`)
    .max(max, `${label} maksimal ${max} karakter.`);

export const guestCheckinSchema = z.object({
  fullname: z
    .string()
    .trim()
    .min(1, 'Nama Tamu wajib diisi.')
    .min(2, 'Nama Tamu minimal 2 huruf.')
    .max(150, 'Nama Tamu maksimal 150 karakter.'),
  institution: requiredText(150, 'Instansi'),
  purpose: requiredText(1000, 'Keperluan Kunjungan'),
  photo_base64: z
    .string({ required_error: 'Foto pengunjung wajib diambil sebelum mendaftar.', invalid_type_error: 'Foto pengunjung wajib diambil sebelum mendaftar.' })
    .min(100, 'Foto pengunjung wajib diambil sebelum mendaftar.'),
});

export type GuestCheckinPayload = z.infer<typeof guestCheckinSchema>;
