import { describe, expect, it } from 'vitest';
import { guestCheckinSchema } from './guestForm';

const photo = `data:image/jpeg;base64,${'A'.repeat(200)}`;
const valid = { fullname: 'Nuri', institution: 'SMKN 7 Bandung', purpose: 'Kunjungan industri', photo_base64: photo };

function firstError(input: Record<string, unknown>) {
  const result = guestCheckinSchema.safeParse(input);
  return result.success ? null : result.error.issues[0].message;
}

describe('guestCheckinSchema', () => {
  it('menerima isian lengkap dan merapikan spasi', () => {
    const result = guestCheckinSchema.safeParse({
      fullname: '  Nuri  ',
      institution: ' SMKN 7 Bandung ',
      purpose: ' Kunjungan industri ',
      photo_base64: photo,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fullname).toBe('Nuri');
      expect(result.data.institution).toBe('SMKN 7 Bandung');
      expect(result.data.purpose).toBe('Kunjungan industri');
    }
  });

  it('nama kosong ditolak', () => {
    expect(firstError({ ...valid, fullname: '   ' })).toBe('Nama Tamu wajib diisi.');
  });

  it('nama satu huruf ditolak sebelum sampai ke backend', () => {
    expect(firstError({ ...valid, fullname: 'A' })).toBe('Nama Tamu minimal 2 huruf.');
  });

  it('instansi wajib diisi', () => {
    expect(firstError({ ...valid, institution: '  ' })).toBe('Instansi wajib diisi.');
  });

  it('keperluan wajib diisi', () => {
    expect(firstError({ ...valid, purpose: '' })).toBe('Keperluan Kunjungan wajib diisi.');
  });

  it('foto wajib ada', () => {
    expect(firstError({ ...valid, photo_base64: undefined })).toBe('Foto pengunjung wajib diambil sebelum mendaftar.');
  });

  it('batas panjang mengikuti backend', () => {
    expect(firstError({ ...valid, institution: 'x'.repeat(151) })).toBe('Instansi maksimal 150 karakter.');
  });
});
