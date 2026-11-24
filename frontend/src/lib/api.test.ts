import { describe, expect, it } from 'vitest';
import { resolveServerUrl } from './api';

describe('resolveServerUrl', () => {
  it('menambahkan alamat backend ke path /api/', () => {
    expect(resolveServerUrl('/api/v1/settings/logo/logo.png')).toBe('http://localhost:5000/api/v1/settings/logo/logo.png');
  });

  it('membiarkan URL lengkap, data URI, dan file di public apa adanya', () => {
    expect(resolveServerUrl('https://contoh.id/logo.png')).toBe('https://contoh.id/logo.png');
    expect(resolveServerUrl('data:image/png;base64,AAA')).toBe('data:image/png;base64,AAA');
    expect(resolveServerUrl('/seamolec-logo.png')).toBe('/seamolec-logo.png');
  });

  it('mengembalikan null kalau kosong', () => {
    expect(resolveServerUrl(null)).toBeNull();
  });
});
