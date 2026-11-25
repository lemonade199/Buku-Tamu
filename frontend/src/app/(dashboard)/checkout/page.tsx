'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api, { getVisitorPhotoUrl } from '@/lib/api';
import { formatJam } from '@/lib/datetime';
import { LogOut, Search, RefreshCw, CheckCircle2, AlertCircle, User, X } from 'lucide-react';
import CheckoutConfirmModal, { ActiveVisitor } from '@/components/CheckoutConfirmModal';
import { useAutoDismiss } from '@/hooks/useAutoDismiss';

export default function CheckoutPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const userPerms = user?.permissions || [];
  const hasAccess = userPerms.includes('*') || userPerms.includes('visitors.checkout');

  useEffect(() => {
    if (!authLoading && user && !hasAccess) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router, hasAccess]);

  const [activeVisitors, setActiveVisitors] = useState<ActiveVisitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedVisitor, setSelectedVisitor] = useState<ActiveVisitor | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processingCheckout, setProcessingCheckout] = useState(false);

  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  useAutoDismiss(feedback, () => setFeedback(null));

  const fetchActiveVisitors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: ActiveVisitor[] }>('/visitors/active');
      setActiveVisitors(res.data.data || []);
    } catch (err) {
      console.error('Gagal mengambil daftar tamu aktif:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveVisitors();
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchActiveVisitors();
    }, 20000);

    const onVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        fetchActiveVisitors();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [fetchActiveVisitors]);

  // Pratinjau foto bisa ditutup dengan tombol Escape.
  useEffect(() => {
    if (!previewPhotoUrl) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewPhotoUrl(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previewPhotoUrl]);

  const handleConfirmCheckout = async (visitorId: number, notes?: string) => {
    setProcessingCheckout(true);
    try {
      const res = await api.post(`/visitors/${visitorId}/checkout`, { notes });
      setIsModalOpen(false);
      setSelectedVisitor(null);
      setFeedback({
        type: 'success',
        message: res.data.message || 'Check-out tamu berhasil dan kartu pass telah dikembalikan ke status tersedia.',
      });
      fetchActiveVisitors();
    } catch (err: any) {
      console.error('Checkout error:', err);
      const msg = err.response?.data?.message || 'Gagal memproses check-out pengunjung.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setProcessingCheckout(false);
    }
  };

  // "pass #01", "#01", dan "01" sama-sama cocok dengan nomor pass 01.
  const term = searchTerm.trim().toLowerCase().replace(/^pass\s*#?|^#/, '');
  const filteredVisitors = activeVisitors.filter((v) => {
    if (!term) return true;
    const passNo = (v.no_pass || String(v.id_pass)).toLowerCase();
    return (
      v.fullname.toLowerCase().includes(term) ||
      passNo.includes(term) ||
      (v.institution || '').toLowerCase().includes(term) ||
      (v.representing || '').toLowerCase().includes(term) ||
      (v.purpose || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#3B0A11] tracking-tight">Pengembalian Akses</h1>
        <button
          type="button"
          onClick={fetchActiveVisitors}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-full text-xs font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A001A]"
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
          className={`p-3.5 rounded-xl border text-xs sm:text-sm flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" aria-hidden="true" />
            )}
            <span className="font-medium">{feedback.message}</span>
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
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cari nama / instansi / no. pass"
          aria-label="Cari nama, instansi, atau nomor pass tamu"
          className="w-full bg-white border border-gray-300 rounded-full pl-11 pr-4 py-2 text-xs text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30 focus:border-[#8A001A] font-medium"
        />
      </div>

      <section aria-labelledby="active-heading" className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 id="active-heading" className="text-lg font-semibold text-[#3B0A11]">
            Tamu di Lokasi Saat Ini
          </h2>
          <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-[#8A001A] text-white text-xs font-bold">
            {activeVisitors.length}
          </span>
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
              <col className="w-[148px]" />
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
              {loading && activeVisitors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-xs text-gray-500">
                    Memuat data pengunjung aktif...
                  </td>
                </tr>
              ) : filteredVisitors.length > 0 ? (
                filteredVisitors.map((visitor) => {
                  const passNo = (visitor.no_pass || String(visitor.id_pass)).padStart(2, '0');
                  return (
                    <tr key={visitor.id_visitor} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setPreviewPhotoUrl(getVisitorPhotoUrl(visitor.id_visitor))}
                          aria-label={`Lihat foto ${visitor.fullname}`}
                          className="relative w-9 h-9 rounded-full bg-gray-400 overflow-hidden flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A001A] hover:ring-2 hover:ring-[#8A001A]/40"
                        >
                          <User className="w-5 h-5 text-white absolute" aria-hidden="true" />
                          <img
                            src={getVisitorPhotoUrl(visitor.id_visitor)}
                            alt=""
                            width={36}
                            height={36}
                            className="w-full h-full object-cover relative"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-gray-900 truncate" title={visitor.fullname}>
                        {visitor.fullname}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700 truncate" title={visitor.institution || '-'}>
                        {visitor.institution || '-'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700 truncate" title={visitor.purpose || '-'}>
                        {visitor.purpose || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block px-3 py-0.5 bg-[#4A000E] text-white text-xs font-bold rounded-full tabular-nums">
                          {passNo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700 text-center tabular-nums">
                        {formatJam(visitor.check_in_at)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedVisitor(visitor);
                            setIsModalOpen(true);
                          }}
                          className="px-4 py-1.5 bg-[#8A001A] hover:bg-[#700015] active:bg-[#5A0011] text-white text-xs font-bold rounded-full transition-colors cursor-pointer inline-flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#8A001A]"
                        >
                          <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Check-Out</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-xs text-gray-500">
                    {term ? 'Tidak ada tamu yang cocok dengan pencarian.' : 'Tidak ada pengunjung aktif di lokasi.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <CheckoutConfirmModal
        isOpen={isModalOpen}
        visitor={selectedVisitor}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedVisitor(null);
        }}
        onConfirm={handleConfirmCheckout}
        loading={processingCheckout}
      />

      {previewPhotoUrl && (
        <div
          onClick={() => setPreviewPhotoUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Foto pengunjung"
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white rounded-2xl overflow-hidden shadow-2xl max-w-sm w-full p-4 space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <h4 className="text-xs font-bold text-gray-900">Foto Pengunjung</h4>
              <button
                type="button"
                onClick={() => setPreviewPhotoUrl(null)}
                aria-label="Tutup pratinjau foto"
                className="p-1 rounded-full text-gray-500 hover:text-gray-800 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A001A]"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <div className="aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center relative">
              <User className="w-12 h-12 text-gray-300 absolute" aria-hidden="true" />
              <img
                src={previewPhotoUrl}
                alt="Foto pengunjung"
                className="w-full h-full object-cover relative"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
