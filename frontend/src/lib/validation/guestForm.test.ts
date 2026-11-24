import { describe, expect, it } from 'vitest';
import { guestCheckinSchema } from './guestForm';

const photo = `data:image/jpeg;base64,${'A'.repeat(200)}`;

function firstError(input: Record<string, unknown>) {
  const result = guestCheckinSchema.safeParse(input);
  return result.success ? null : result.error.issues[0].message;
}

describe('guestCheckinSchema', () => {
  it('menerima isian lengkap dan merapikan spasi', () => {
    const result = guestCheckinSchema.safeParse({
      fullname: '  Nuri  ',
      institution: ' SMKN 7 Bandung ',
      purpose: '',
      photo_base64: photo,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fullname).toBe('Nuri');
      expect(result.data.institution).toBe('SMKN 7 Bandung');
      // Isian kosong tidak dikirim ke backend.
      expect(result.data.purpose).toBeUndefined();
    }
  });

  it('nama kosong ditolak dengan pesan yang sama seperti sebelumnya', () => {
    expect(firstError({ fullname: '   ', institution: '', purpose: '', photo_base64: photo })).toBe('Nama Tamu wajib diisi.');
  });

  it('nama satu huruf ditolak sebelum sampai ke backend', () => {
    expect(firstError({ fullname: 'A', institution: '', purpose: '', photo_base64: photo })).toBe('Nama Tamu minimal 2 huruf.');
  });

  it('foto wajib ada', () => {
    expect(firstError({ fullname: 'Nuri', institution: '', purpose: '', photo_base64: undefined })).toBe(
      'Foto pengunjung wajib diambil sebelum mendaftar.'
    );
  });

  it('batas panjang mengikuti backend', () => {
    expect(firstError({ fullname: 'Nuri', institution: 'x'.repeat(151), purpose: '', photo_base64: photo })).toBe(
      'Asal instansi maksimal 150 karakter.'
    );
  });
});
