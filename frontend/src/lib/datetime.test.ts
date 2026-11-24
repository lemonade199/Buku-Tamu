import { describe, expect, it } from 'vitest';
import { formatJam, parseServerDate } from './datetime';

describe('parseServerDate', () => {
  it('membaca waktu backend tanpa zona sebagai UTC', () => {
    expect(parseServerDate('2026-11-24T06:30:00')?.toISOString()).toBe('2026-11-24T06:30:00.000Z');
  });

  it('menghormati zona yang sudah tertulis', () => {
    expect(parseServerDate('2026-11-24T13:30:00+07:00')?.toISOString()).toBe('2026-11-24T06:30:00.000Z');
  });

  it('mengembalikan null untuk nilai kosong atau rusak', () => {
    expect(parseServerDate(null)).toBeNull();
    expect(parseServerDate('')).toBeNull();
    expect(parseServerDate('bukan tanggal')).toBeNull();
  });
});

describe('formatJam', () => {
  it('menampilkan jam WIB, bukan UTC', () => {
    expect(formatJam('2026-11-24T06:30:00')).toBe('13.30');
  });

  it('bisa memakai pemisah titik dua', () => {
    expect(formatJam('2026-11-24T01:05:00', ':')).toBe('08:05');
  });

  it('menampilkan tanda strip kalau jam tidak ada', () => {
    expect(formatJam(undefined)).toBe('-');
  });
});
