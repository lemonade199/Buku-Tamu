import { describe, expect, it } from 'vitest';
import { describeActivity } from './activity';
import type { RecentActivity } from '@/types';

const base: RecentActivity = { id: 1, date: 'Selasa, 24/11/2026', time: '13.52', description: '' };

describe('describeActivity', () => {
  it('menyebut resepsionis yang menyetujui', () => {
    expect(
      describeActivity({ ...base, action: 'VISITOR_REGISTRATION_APPROVED', actor: 'Roseanne', visitor_name: 'nuri', no_pass: '01' })
    ).toBe('Roseanne menyetujui kunjungan nuri (kartu 01)');
  });

  it('pendaftaran dari form tamu tidak punya pelaku', () => {
    expect(
      describeActivity({ ...base, action: 'VISITOR_REGISTER_PENDING', actor: null, visitor_name: 'nuri', no_pass: '01' })
    ).toBe('nuri mengisi buku tamu dan menunggu persetujuan (kartu 01)');
  });

  it('check-out menyebut kartu yang kembali', () => {
    expect(
      describeActivity({ ...base, action: 'VISITOR_CHECKOUT', actor: 'Roseanne', visitor_name: 'annis', no_pass: '02' })
    ).toBe('Roseanne mencatat annis pulang, kartu 02 kembali ke rak');
  });

  it('status kartu ditulis dalam bahasa Indonesia', () => {
    expect(
      describeActivity({ ...base, action: 'PASS_STATUS_CHANGE', actor: 'jennie', no_pass: '05', to_status: 'MAINTENANCE' })
    ).toBe('jennie mengubah kartu 05 menjadi Perbaikan');
  });

  it('aksi lain memakai kalimat dari backend dengan nama pelaku', () => {
    expect(
      describeActivity({ ...base, action: 'ROLE_DELETED', actor: 'jennie', description: 'Role security dihapus.' })
    ).toBe('jennie: Role security dihapus.');
  });

  it('data lama tanpa action tetap tampil', () => {
    expect(describeActivity({ ...base, description: 'Catatan lama' })).toBe('Catatan lama');
  });
});
