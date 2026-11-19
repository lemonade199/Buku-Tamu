'use client';

import React, { useState, useEffect, useCallback } from 'react';
import api, { getVisitorPhotoUrl } from '@/lib/api';
import {
  LogOut,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  User,
  Sparkles,
  Eye,
  X,
} from 'lucide-react';
import CheckoutConfirmModal, { ActiveVisitor } from '@/components/CheckoutConfirmModal';

export default function CheckoutPage() {
  const [activeVisitors, setActiveVisitors] = useState<ActiveVisitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [quickPassNo, setQuickPassNo] = useState('');
  const [quickError, setQuickError] = useState('');

  const [selectedVisitor, setSelectedVisitor] = useState<ActiveVisitor | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processingCheckout, setProcessingCheckout] = useState(false);

  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

  const handleQuickCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    setQuickError('');

    const query = quickPassNo.trim().replace(/^pass\s*#?/i, '');
    if (!query) {
      setQuickError('Masukkan nomor pass');
      return;
    }

    const matched = activeVisitors.find(
      (v) => (v.no_pass && v.no_pass.toLowerCase() === query.toLowerCase()) || String(v.id_pass) === query
    );

    if (!matched) {
      setQuickError(`Tidak ditemukan kunjungan aktif dengan kartu pass #${query}`);
      return;
    }

    setSelectedVisitor(matched);
    setIsModalOpen(true);
    setQuickPassNo('');
  };

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

  const filteredVisitors = activeVisitors.filter((v) => {
    const term = searchTerm.toLowerCase();
    const nameMatch = v.fullname.toLowerCase().includes(term);
    const passMatch = (v.no_pass || '').toLowerCase().includes(term);
    const instMatch = (v.institution || '').toLowerCase().includes(term);
    const repMatch = (v.representing || '').toLowerCase().includes(term);
    return nameMatch || passMatch || instMatch || repMatch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-charcoal tracking-tight flex items-center space-x-2">
            <LogOut className="w-5 h-5 text-brand-500" />
            <span>Check-Out Pengunjung</span>
          </h2>
          <p className="text-xs text-charcoal-muted mt-0.5">
            Pencatatan kepulangan tamu dan penerimaan kembali kartu pass fisik ke rak
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchActiveVisitors}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-white border border-ivory-200 text-charcoal text-xs font-semibold rounded-lg shadow-sm hover:bg-ivory-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-500' : ''}`} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-center justify-between shadow-sm animate-fadeIn ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold text-gray-500 hover:text-gray-800"
          >
            Tutup
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl p-5 border border-ivory-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-charcoal flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-brand-500" />
              <span>Check-Out Cepat Berdasarkan Nomor Pass</span>
            </h3>
            <p className="text-xs text-charcoal-muted">
              Pindai atau masukkan nomor kartu pass fisik yang dikembalikan pengunjung di loket
            </p>
          </div>

          <form onSubmit={handleQuickCheckout} className="flex items-center space-x-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <CreditCard className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={quickPassNo}
                onChange={(e) => {
                  setQuickPassNo(e.target.value);
                  setQuickError('');
                }}
                placeholder="Contoh: 01 atau pass #01"
                className="w-full pl-9 pr-3 py-2 text-xs font-mono border border-ivory-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl shadow transition-colors shrink-0 flex items-center space-x-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Proses Check-Out</span>
            </button>
          </form>
        </div>

        {quickError && (
          <p className="text-xs text-red-600 mt-2 font-medium flex items-center space-x-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{quickError}</span>
          </p>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-ivory-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-ivory-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-ivory-50/50">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-charcoal uppercase tracking-wider">
              Tamu di Lokasi Saat Ini
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800">
              {activeVisitors.length} Orang
            </span>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama, instansi, pass..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-ivory-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-ivory-100/70 text-[11px] uppercase tracking-wider text-charcoal-muted font-bold border-b border-ivory-200">
                <th className="py-3 px-4">No. Pass</th>
                <th className="py-3 px-4">Pengunjung</th>
                <th className="py-3 px-4">Instansi</th>
                <th className="py-3 px-4">Pihak Dituju & Keperluan</th>
                <th className="py-3 px-4">Waktu Masuk & Durasi</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-200 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-charcoal-muted">
                    <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Memuat data pengunjung aktif...</span>
                  </td>
                </tr>
              ) : filteredVisitors.length > 0 ? (
                filteredVisitors.map((visitor) => {
                  const checkinDate = new Date(visitor.check_in_at);
                  const now = new Date();
                  const diffMinutes = Math.max(1, Math.round((now.getTime() - checkinDate.getTime()) / (1000 * 60)));
                  const hours = Math.floor(diffMinutes / 60);
                  const minutes = diffMinutes % 60;
                  const durationStr = hours > 0 ? `${hours}j ${minutes}m` : `${minutes}m`;

                  return (
                    <tr key={visitor.id_visitor} className="hover:bg-ivory-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-extrabold bg-brand-50 text-brand-900 border border-brand-200 shadow-sm">
                          pass #{visitor.no_pass || visitor.id_pass}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div
                            onClick={() => setPreviewPhotoUrl(getVisitorPhotoUrl(visitor.id_visitor))}
                            className="w-10 h-10 rounded-xl bg-ivory-100 overflow-hidden border border-ivory-200 relative group cursor-pointer shrink-0 shadow-sm flex items-center justify-center"
                            title="Klik untuk melihat foto lebih besar"
                          >
                            <User className="w-5 h-5 text-gray-400 absolute" />
                            <img
                              src={getVisitorPhotoUrl(visitor.id_visitor)}
                              alt={visitor.fullname}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform relative z-10"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white z-20">
                              <Eye className="w-3.5 h-3.5" />
                            </div>
                          </div>

                          <div>
                            <div className="font-bold text-charcoal">{visitor.fullname}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-charcoal font-medium">
                        {visitor.institution || '-'}
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <div className="text-charcoal font-semibold">{visitor.representing || '-'}</div>
                        <div className="text-[11px] text-charcoal-muted truncate" title={visitor.purpose}>
                          {visitor.purpose || '-'}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-mono text-charcoal font-medium">
                          {checkinDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                        </div>
                        <span className="inline-block mt-0.5 text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full">
                          Durasi: {durationStr}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedVisitor(visitor);
                            setIsModalOpen(true);
                          }}
                          className="px-3.5 py-1.5 bg-brand-500 hover:bg-brand-600 active:scale-95 text-white text-xs font-bold rounded-lg shadow-sm transition-all inline-flex items-center space-x-1.5"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Check-Out</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-charcoal-muted">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-charcoal">Tidak ada pengunjung aktif di lokasi.</p>
                    <p className="text-[11px] text-charcoal-muted mt-0.5">
                      {searchTerm ? 'Coba ubah kata kunci pencarian Anda.' : 'Semua tamu telah menyelesaikan kunjungan dan check-out.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white rounded-3xl overflow-hidden shadow-2xl max-w-sm w-full border border-white/20 p-4 space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-ivory-200">
              <h4 className="text-xs font-bold text-charcoal">Foto Pengunjung</h4>
              <button
                onClick={() => setPreviewPhotoUrl(null)}
                className="p-1 rounded-full text-gray-500 hover:text-gray-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-ivory-100 border border-ivory-200 flex items-center justify-center relative">
              <User className="w-12 h-12 text-gray-300 absolute" />
              <img
                src={previewPhotoUrl}
                alt="Foto Pengunjung"
                className="w-full h-full object-cover relative z-10"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <button
              onClick={() => setPreviewPhotoUrl(null)}
              className="w-full py-2 bg-ivory-100 hover:bg-ivory-200 text-charcoal text-xs font-semibold rounded-xl"
            >
              Tutup Pratinjau
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
