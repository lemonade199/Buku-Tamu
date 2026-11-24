'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { parseServerDate } from '@/lib/datetime';

interface AuditEntry {
  id: number;
  action: string;
  description: string;
  actor: string;
  created_at: string | null;
}

const ACTION_LABEL: Record<string, string> = {
  USER_CREATED: 'Akun baru',
  USER_ROLE_CHANGED: 'Ganti role',
  USER_ACTIVATED: 'Akun diaktifkan',
  USER_DEACTIVATED: 'Akun dinonaktifkan',
  ROLE_CREATED: 'Role baru',
  ROLE_UPDATED: 'Ubah role',
  ROLE_DELETED: 'Hapus role',
  PERMISSION_MATRIX_UPDATED: 'Ubah hak akses',
};

export const ACCESS_AUDIT_REFRESH_EVENT = 'access-audit-refresh';

function formatWaktu(value: string | null) {
  const d = parseServerDate(value);
  if (!d) return '-';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} · ${pad(d.getHours())}.${pad(d.getMinutes())}`;
}

// Riwayat siapa mengubah role atau izin siapa, kapan, dan dari nilai apa ke apa.
export default function AccessAuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: AuditEntry[] }>('/auth/audit/access?limit=20');
      setEntries(res.data.data || []);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
    window.addEventListener(ACCESS_AUDIT_REFRESH_EVENT, fetchEntries);
    return () => window.removeEventListener(ACCESS_AUDIT_REFRESH_EVENT, fetchEntries);
  }, [fetchEntries]);

  return (
    <section aria-labelledby="access-audit-heading" className="bg-white rounded-2xl border border-[#E8DCCB] shadow-sm p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 id="access-audit-heading" className="text-lg font-semibold text-[#3B0A11]">
            Riwayat perubahan hak akses
          </h2>
          <p className="text-xs text-gray-600 mt-0.5">20 perubahan terakhir pada pengguna, role, dan izin.</p>
        </div>
        <button
          type="button"
          onClick={fetchEntries}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-full text-xs font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A001A]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true" />
          <span>Segarkan</span>
        </button>
      </div>

      {loading && entries.length === 0 ? (
        <p className="py-6 text-center text-xs text-gray-500">Memuat riwayat…</p>
      ) : error ? (
        <p className="py-6 text-center text-xs text-red-700">Riwayat belum bisa dimuat. Coba Segarkan.</p>
      ) : entries.length === 0 ? (
        <p className="py-6 text-center text-xs text-gray-500">
          Belum ada perubahan tercatat. Perubahan role dan izin berikutnya akan muncul di sini.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] table-fixed text-left border-collapse text-xs">
            <colgroup>
              <col className="w-[132px]" />
              <col className="w-[132px]" />
              <col className="w-[120px]" />
              <col />
            </colgroup>
            <thead>
              <tr className="border-b border-gray-200 bg-[#FAF7F0]">
                <th scope="col" className="px-3 py-2.5 font-semibold text-gray-600">Waktu</th>
                <th scope="col" className="px-3 py-2.5 font-semibold text-gray-600">Oleh</th>
                <th scope="col" className="px-3 py-2.5 font-semibold text-gray-600">Jenis</th>
                <th scope="col" className="px-3 py-2.5 font-semibold text-gray-600">Perubahan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((e) => (
                <tr key={e.id} className="align-top">
                  <td className="px-3 py-2.5 text-gray-700 tabular-nums whitespace-nowrap">{formatWaktu(e.created_at)}</td>
                  <td className="px-3 py-2.5 font-semibold text-gray-900 truncate" title={e.actor}>{e.actor}</td>
                  <td className="px-3 py-2.5 text-gray-700">{ACTION_LABEL[e.action] || e.action}</td>
                  <td className="px-3 py-2.5 text-gray-900 leading-relaxed">{e.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
