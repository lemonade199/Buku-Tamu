import { z } from 'zod';

// Batas panjang mengikuti CheckinRequest di backend (backend/app/schemas/visitor.py).
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} maksimal ${max} karakter.`)
    .transform((v) => (v === '' ? undefined : v));

export const guestCheckinSchema = z.object({
  fullname: z
    .string()
    .trim()
    .min(1, 'Nama Tamu wajib diisi.')
    .min(2, 'Nama Tamu minimal 2 huruf.')
    .max(150, 'Nama Tamu maksimal 150 karakter.'),
  institution: optionalText(150, 'Asal instansi'),
  purpose: optionalText(1000, 'Keperluan'),
  photo_base64: z
    .string({ required_error: 'Foto pengunjung wajib diambil sebelum mendaftar.', invalid_type_error: 'Foto pengunjung wajib diambil sebelum mendaftar.' })
    .min(100, 'Foto pengunjung wajib diambil sebelum mendaftar.'),
});

export type GuestCheckinPayload = z.infer<typeof guestCheckinSchema>;
