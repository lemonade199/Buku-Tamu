import type { RecentActivity } from '@/types';

const PASS_STATUS_LABEL: Record<string, string> = {
  AVAILABLE: 'Tersedia',
  PENDING: 'Menunggu',
  IN_USE: 'Dipakai',
  MAINTENANCE: 'Perbaikan',
  LOST: 'Hilang',
  INACTIVE: 'Nonaktif',
};

function statusLabel(code?: string | null) {
  if (!code) return null;
  return PASS_STATUS_LABEL[code] ?? code.toLowerCase();
}

/** Menyusun kalimat aktivitas untuk dashboard admin dari data audit log. */
export function describeActivity(act: RecentActivity): string {
  const who = act.actor || null;
  const guest = act.visitor_name || 'tamu';
  const card = act.no_pass ? ` (kartu ${act.no_pass})` : '';

  switch (act.action) {
    case 'VISITOR_REGISTER_PENDING':
      return `${guest} mengisi buku tamu dan menunggu persetujuan${card}`;
    case 'VISITOR_REGISTRATION_APPROVED':
      return who ? `${who} menyetujui kunjungan ${guest}${card}` : `Kunjungan ${guest} disetujui${card}`;
    case 'VISITOR_REGISTRATION_REJECTED':
      return who ? `${who} menolak kunjungan ${guest}${card}` : `Kunjungan ${guest} ditolak${card}`;
    case 'VISITOR_CHECKOUT':
      return who
        ? `${who} mencatat ${guest} pulang, kartu ${act.no_pass ?? ''} kembali ke rak`.trimEnd()
        : `${guest} pulang, kartu ${act.no_pass ?? ''} kembali ke rak`.trimEnd();
    case 'VISITOR_UPDATE':
      return `${who ?? 'Data'} mengubah data tamu ${guest}`;
    case 'PASS_STATUS_CHANGE': {
      const to = statusLabel(act.to_status);
      const target = act.no_pass ? `kartu ${act.no_pass}` : 'status kartu';
      if (to) return `${who ?? 'Sistem'} mengubah ${target} menjadi ${to}`;
      return `${who ?? 'Sistem'} mengubah ${target}`;
    }
    case 'PASS_DELETE':
      return `${who ?? 'Sistem'} menghapus kartu${act.no_pass ? ` ${act.no_pass}` : ''}`;
    case 'DATABASE_BACKUP_CREATED':
      return who ? `${who} membuat cadangan database` : 'Cadangan database otomatis dibuat';
    case 'DATABASE_BACKUP_DELETED':
      return `${who ?? 'Sistem'} menghapus file cadangan database`;
    case 'DATABASE_RESTORE_PERFORMED':
      return `${who ?? 'Sistem'} memulihkan database dari cadangan`;
    case 'DATA_RETENTION_CLEANUP_PERFORMED':
      return 'Data kunjungan lama dibersihkan otomatis';
    default:
      // Perubahan user, role, dan hak akses sudah ditulis dengan kalimat biasa oleh backend.
      return who ? `${who}: ${act.description}` : act.description;
  }
}
