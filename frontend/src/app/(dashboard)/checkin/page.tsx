'use client';

import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { VisitorItem } from '@/types';
import {
  Search,
  User,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  Building,
  Clock,
  RefreshCw,
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export default function ReceptionGuestIntakePage() {
  const [visitors, setVisitors] = useState<VisitorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<VisitorItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [detailVisitor, setDetailVisitor] = useState<VisitorItem | null>(null);

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
    const interval = setInterval(fetchPendingVisitors, 4000);
    return () => clearInterval(interval);
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
      setDetailVisitor(null);
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
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      setFeedback({ type: 'error', text: 'Alasan penolakan wajib diisi.' });
      return;
    }

    setRejecting(true);
    setFeedback(null);
    try {
      const res = await api.post(`/visitors/${rejectTarget.id_visitor}/reject`, {
        reason: rejectReason.trim(),
      });
      setFeedback({
        type: 'success',
        text: res.data.message || `Registrasi tamu ${rejectTarget.fullname} ditolak. Kartu kembali AVAILABLE.`,
      });
      setRejectTarget(null);
      setRejectReason('');
      setDetailVisitor(null);
      fetchPendingVisitors();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal menolak registrasi tamu.';
      setFeedback({ type: 'error', text: msg });
    } finally {
      setRejecting(false);
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
        <h1 className="text-3xl font-extrabold italic text-[#3B0A11] tracking-tight">
          Penerimaan Tamu
        </h1>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            fetchPendingVisitors();
          }}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-full text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-2xs transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#8A001A]' : ''}`} />
          <span>Segarkan</span>
        </button>
      </div>

      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between shadow-2xs ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-rose-50 text-rose-800 border-rose-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-gray-400 hover:text-gray-600 cursor-pointer p-1"
            aria-label="Tutup notifikasi"
          >
            ✕
          </button>
        </div>
      )}

      <div className="relative w-full max-w-xl">
        <Search className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cari nama / instansi / no. pass"
          aria-label="Cari nama, instansi, atau nomor pass tamu"
          className="w-full bg-white border border-gray-900 rounded-full pl-11 pr-4 py-2 text-xs text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30 shadow-xs font-medium"
        />
      </div>

      <div className="overflow-x-auto pt-2">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="pb-3 text-xs italic font-bold text-[#3B0A11] underline uppercase tracking-wider">
                Foto
              </th>
              <th className="pb-3 text-xs italic font-bold text-[#3B0A11] underline uppercase tracking-wider">
                Nama
              </th>
              <th className="pb-3 text-xs italic font-bold text-[#3B0A11] underline uppercase tracking-wider">
                Instansi
              </th>
              <th className="pb-3 text-xs italic font-bold text-[#3B0A11] underline uppercase tracking-wider">
                Keperluan
              </th>
              <th className="pb-3 text-xs italic font-bold text-[#3B0A11] underline uppercase tracking-wider text-center">
                No. pass
              </th>
              <th className="pb-3 text-xs italic font-bold text-[#3B0A11] underline uppercase tracking-wider text-center">
                Jam masuk
              </th>
              <th className="pb-3 text-xs italic font-bold text-[#3B0A11] underline uppercase tracking-wider text-center">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading && visitors.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-xs text-gray-500">
                  Memuat daftar antrian tamu...
                </td>
              </tr>
            ) : filteredVisitors.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-xs text-gray-500">
                  {searchTerm ? 'Tidak ada tamu yang cocok dengan pencarian.' : 'Tidak ada tamu yang sedang menunggu penerimaan kartu pass.'}
                </td>
              </tr>
            ) : (
              filteredVisitors.map((v) => {
                const passNum = v.no_pass || String(v.id_pass);
                const formattedPass = passNum.padStart(2, '0');
                const timeStr = v.check_in_at
                  ? `${String(new Date(v.check_in_at).getHours()).padStart(2, '0')}.${String(new Date(v.check_in_at).getMinutes()).padStart(2, '0')}`
                  : '-';

                return (
                  <tr key={v.id_visitor} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3">
                      <div className="w-9 h-9 rounded-full bg-gray-400 overflow-hidden flex items-center justify-center shrink-0">
                        {v.capture_id ? (
                          <img
                            src={`${API_BASE_URL}/visitors/${v.id_visitor}/photo`}
                            alt={v.fullname}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-5 h-5 text-white" />
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-xs font-bold text-gray-900 pr-3">
                      {v.fullname}
                    </td>
                    <td className="py-3 text-xs text-gray-700 pr-3">
                      {v.institution || '-'}
                    </td>
                    <td className="py-3 text-xs text-gray-700 pr-3 max-w-xs truncate" title={v.purpose || '-'}>
                      {v.purpose || '-'}
                    </td>
                    <td className="py-3 text-center">
                      <span className="inline-block px-3 py-0.5 bg-[#4A000E] text-white text-xs font-bold rounded-full">
                        {formattedPass}
                      </span>
                    </td>
                    <td className="py-3 text-xs text-gray-700 text-center">
                      {timeStr}
                    </td>
                    <td className="py-3 text-center">
                      <div className="inline-flex items-center justify-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleConfirmApprove(v)}
                          disabled={approvingId === v.id_visitor}
                          className="px-4 py-1.5 bg-[#8A001A] hover:bg-[#700015] disabled:opacity-50 text-white text-xs font-bold rounded-full shadow-xs transition-colors cursor-pointer"
                        >
                          {approvingId === v.id_visitor ? 'Menyerahkan...' : 'Serahkan kartu'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRejectTarget(v);
                            setRejectReason('');
                          }}
                          className="px-3 py-1.5 bg-gray-200 hover:bg-rose-100 hover:text-rose-800 text-gray-700 text-xs font-bold rounded-full transition-colors cursor-pointer"
                        >
                          Tolak
                        </button>
                        <button
                          type="button"
                          onClick={() => setDetailVisitor(v)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold rounded-full transition-colors cursor-pointer"
                        >
                          Detail
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

      {detailVisitor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
            <div className="bg-[#8A001A] text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Detail Permohonan Tamu</h3>
                <p className="text-xs text-white/80">Verifikasi kartu pass dan identitas tamu</p>
              </div>
              <button
                type="button"
                onClick={() => setDetailVisitor(null)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 rounded-2xl bg-gray-200 overflow-hidden shrink-0 flex items-center justify-center border border-gray-300">
                  {detailVisitor.capture_id ? (
                    <img
                      src={`${API_BASE_URL}/visitors/${detailVisitor.id_visitor}/photo`}
                      alt={detailVisitor.fullname}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-gray-400" />
                  )}
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-gray-900">{detailVisitor.fullname}</h4>
                  <p className="text-xs text-gray-600 font-medium">{detailVisitor.institution || '-'}</p>
                  <div className="mt-1.5 inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#8A001A] text-white">
                    Pass #{detailVisitor.no_pass || detailVisitor.id_pass}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 space-y-2.5 text-xs">
                <div className="flex items-center space-x-2 text-gray-700">
                  <Building className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="font-semibold">Bertemu dengan:</span>
                  <span>{detailVisitor.representing || '-'}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-700">
                  <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="font-semibold">Waktu Registrasi:</span>
                  <span>
                    {detailVisitor.check_in_at
                      ? new Date(detailVisitor.check_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
                      : '-'}
                  </span>
                </div>
                <div className="pt-1 text-gray-700 border-t border-gray-200/80">
                  <span className="font-semibold block mb-0.5">Keperluan Kunjungan:</span>
                  <p className="text-gray-600 leading-relaxed">{detailVisitor.purpose || '-'}</p>
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectTarget(detailVisitor);
                    setRejectReason('');
                  }}
                  className="flex-1 py-2.5 bg-gray-200 hover:bg-rose-100 hover:text-rose-800 text-gray-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Tolak Permohonan
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmApprove(detailVisitor)}
                  disabled={approvingId === detailVisitor.id_visitor}
                  className="flex-1 py-2.5 bg-[#8A001A] hover:bg-[#700015] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {approvingId === detailVisitor.id_visitor ? 'Memproses...' : 'Serahkan Kartu Pass'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 border border-gray-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Tolak Permohonan Tamu</h3>
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Apakah Anda yakin ingin menolak permohonan kunjungan <strong>{rejectTarget.fullname}</strong>?
              Nomor pass <strong>#{rejectTarget.no_pass || rejectTarget.id_pass}</strong> akan langsung dikembalikan ke rak dengan status <strong>AVAILABLE</strong>.
            </p>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Alasan Penolakan <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Contoh: Pegawai yang dituju sedang dinas luar / ID tidak valid"
                  rows={3}
                  className="w-full text-xs p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
                  required
                />
              </div>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setRejectTarget(null)}
                  className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={rejecting || !rejectReason.trim()}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  {rejecting ? 'Menolak...' : 'Konfirmasi Tolak'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
