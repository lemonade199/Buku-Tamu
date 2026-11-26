'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api, { getVisitorPhotoUrl } from '@/lib/api';
import { formatJam } from '@/lib/datetime';
import { VisitorItem } from '@/types';
import { Search, User, CheckCircle2, AlertCircle, X, RefreshCw } from 'lucide-react';
import { useAutoDismiss } from '@/hooks/useAutoDismiss';

export default function ReceptionGuestIntakePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const userPerms = user?.permissions || [];
  const hasAccess = userPerms.includes('*') || userPerms.includes('visitors.create') || userPerms.includes('visitors.read');

  useEffect(() => {
    if (!authLoading && user && !hasAccess) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router, hasAccess]);

  const [visitors, setVisitors] = useState<VisitorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  useAutoDismiss(feedback, () => setFeedback(null));
  const [approvingId, setApprovingId] = useState<number | null>(null);

  // State untuk Tolak permohonan (POST /api/v1/visitors/<id>/reject)
  const [rejectingVisitor, setRejectingVisitor] = useState<VisitorItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);

  const fetchPendingVisitors = useCallback(async () => {
    try {
      const res = await api.get<{
        success: boolean;
        data: VisitorItem[];
        total: number;
      }>('/visitors/pending');
      setVisitors(res.data.data || []);
    } catch (err) {
      console.error('Gagal mengambil daftar antrian penerimaan tamu:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingVisitors();
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchPendingVisitors();
    }, 4000);

    const onVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        fetchPendingVisitors();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [fetchPendingVisitors]);

  const handleConfirmApprove = async (visitor: VisitorItem) => {
    setApprovingId(visitor.id_visitor);
    setFeedback(null);
    try {
      const res = await api.post(`/visitors/${visitor.id_visitor}/approve`);
      setFeedback({
        type: 'success',
        text: res.data.message || `Kartu pass berhasil diserahkan kepada ${visitor.fullname}. Status sekarang IN_USE.`,
      });
      fetchPendingVisitors();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal menyerahkan kartu pass.';
      setFeedback({ type: 'error', text: msg });
    } finally {
      setApprovingId(null);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingVisitor || !rejectReason.trim()) return;
    setSubmittingReject(true);
    setFeedback(null);
    try {
      const res = await api.post(`/visitors/${rejectingVisitor.id_visitor}/reject`, {
        reason: rejectReason.trim(),
      });
      setFeedback({
        type: 'success',
        text: res.data.message || `Permohonan tamu ${rejectingVisitor.fullname} berhasil ditolak.`,
      });
      setRejectingVisitor(null);
      setRejectReason('');
      fetchPendingVisitors();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal menolak permohonan pengunjung.';
      setFeedback({ type: 'error', text: msg });
    } finally {
      setSubmittingReject(false);
    }
  };

  const filteredVisitors = visitors.filter((v) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const nameMatch = v.fullname?.toLowerCase().includes(term);
    const instMatch = v.institution?.toLowerCase().includes(term);
    const passMatch = String(v.no_pass || v.id_pass).includes(term);
    const purposeMatch = v.purpose?.toLowerCase().includes(term);
    return nameMatch || instMatch || passMatch || purposeMatch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#3B0A11] tracking-tight">Penerimaan Tamu</h1>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            fetchPendingVisitors();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-full text-xs font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A001A]"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? 'animate-spin motion-reduce:animate-none text-[#8A001A]' : ''}`}
            aria-hidden="true"
          />
          <span>Segarkan</span>
        </button>
      </div>

      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-rose-50 text-rose-800 border-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
            )}
            <span className="font-semibold">{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-gray-500 hover:text-gray-700 cursor-pointer p-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A001A]"
            aria-label="Tutup notifikasi"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="relative w-full max-w-xl">
        <Search className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" aria-hidden="true" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cari nama / instansi / no. pass"
          aria-label="Cari nama, instansi, atau nomor pass tamu"
          className="w-full bg-white border border-gray-300 rounded-full pl-11 pr-4 py-2 text-xs text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30 focus:border-[#8A001A] font-medium"
        />
      </div>

      <div className="overflow-x-auto bg-white rounded-2xl border border-[#E8DCCB] shadow-sm">
        {/* Lebar kolom tetap supaya header dan isi selalu sejajar, sama dengan tabel di Dashboard. */}
        <table className="w-full min-w-[760px] table-fixed text-left border-collapse">
          <colgroup>
            <col className="w-[72px]" />
            <col className="w-[18%]" />
            <col className="w-[20%]" />
            <col />
            <col className="w-[96px]" />
            <col className="w-[104px]" />
            <col className="w-[260px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-gray-200 bg-[#FAF7F0]">
              <th scope="col" className="px-4 py-3 text-xs font-semibold text-gray-600">Foto</th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold text-gray-600">Nama</th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold text-gray-600">Instansi</th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold text-gray-600">Keperluan</th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold text-gray-600 text-center">No. pass</th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold text-gray-600 text-center">Jam masuk</th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold text-gray-600 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && visitors.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-xs text-gray-500">
                  Memuat daftar antrian tamu...
                </td>
              </tr>
            ) : filteredVisitors.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-xs text-gray-500">
                  {searchTerm
                    ? 'Tidak ada tamu yang cocok dengan pencarian.'
                    : 'Tidak ada tamu yang sedang menunggu penerimaan kartu pass.'}
                </td>
              </tr>
            ) : (
              filteredVisitors.map((v) => {
                const passNum = v.no_pass || String(v.id_pass);
                const formattedPass = passNum.padStart(2, '0');
                const timeStr = formatJam(v.check_in_at);

                return (
                  <tr key={v.id_visitor} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="w-9 h-9 rounded-full bg-gray-400 overflow-hidden flex items-center justify-center">
                        {v.capture_id ? (
                          <img
                            src={getVisitorPhotoUrl(v.id_visitor)}
                            alt={v.fullname}
                            width={36}
                            height={36}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-5 h-5 text-white" aria-hidden="true" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-gray-900 truncate" title={v.fullname}>
                      {v.fullname}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700 truncate" title={v.institution || '-'}>
                      {v.institution || '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700 truncate" title={v.purpose || '-'}>
                      {v.purpose || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block px-3 py-0.5 bg-[#4A000E] text-white text-xs font-bold rounded-full tabular-nums">
                        {formattedPass}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700 text-center tabular-nums">{timeStr}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleConfirmApprove(v)}
                          disabled={approvingId === v.id_visitor}
                          className="px-3 py-1.5 bg-[#8A001A] hover:bg-[#700015] active:bg-[#5A0011] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-full transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#8A001A]"
                        >
                          {approvingId === v.id_visitor ? 'Menyerahkan...' : 'Serahkan'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRejectingVisitor(v);
                            setRejectReason('');
                          }}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-full transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                        >
                          Tolak
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {rejectingVisitor && (
        <div
          onClick={() => setRejectingVisitor(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <form
            onSubmit={handleConfirmReject}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-sm font-bold text-gray-900">Tolak Permohonan Tamu</h2>
              <button
                type="button"
                onClick={() => setRejectingVisitor(null)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-full cursor-pointer"
                aria-label="Tutup modal tolak"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-600">
              Tolak registrasi atas nama <strong className="text-gray-900">{rejectingVisitor.fullname}</strong>? Kartu pass akan dikembalikan ke status tersedia.
            </p>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Alasan Penolakan *</label>
              <textarea
                required
                rows={3}
                maxLength={500}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Contoh: Data identitas tidak sesuai atau pejabat yang dituju sedang tidak di tempat."
                className="w-full text-xs border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingVisitor(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submittingReject || !rejectReason.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 disabled:opacity-50 rounded-xl cursor-pointer"
              >
                {submittingReject ? 'Memproses...' : 'Tolak Permohonan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
