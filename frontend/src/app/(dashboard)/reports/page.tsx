'use client';

import React, { useState, useEffect, useCallback } from 'react';
import api, { getVisitorPhotoUrl } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { VisitorItem } from '@/types';
import {
  Search,
  Calendar,
  ChevronDown,
  User,
  X,
  LogOut,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import CheckoutConfirmModal, { ActiveVisitor } from '@/components/CheckoutConfirmModal';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export default function ReportsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role_code === 'ADMIN';
  const [visitors, setVisitors] = useState<VisitorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilterOpen, setDateFilterOpen] = useState(false);
  const [receptionistFilterOpen, setReceptionistFilterOpen] = useState(false);
  const [selectedReceptionist, setSelectedReceptionist] = useState<string>('Semua resepsionis');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateError, setDateError] = useState('');

  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [downloadingExport, setDownloadingExport] = useState<'excel' | 'pdf' | null>(null);

  const [checkoutVisitor, setCheckoutVisitor] = useState<ActiveVisitor | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [processingCheckout, setProcessingCheckout] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    setDateError('');
    if (endDate && val && endDate < val) {
      setEndDate(val);
    }
  };

  const handleEndDateChange = (val: string) => {
    if (startDate && val && val < startDate) {
      setDateError('Tanggal selesai tidak bisa kurang dari tanggal masuk.');
      return;
    }
    setDateError('');
    setEndDate(val);
  };

  const fetchVisitors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      params.append('limit', '50');

      const res = await api.get<{
        success: boolean;
        data: VisitorItem[];
      }>(`/visitors?${params.toString()}`);

      setVisitors(res.data.data || []);
    } catch (err) {
      console.error('Gagal mengambil laporan kunjungan:', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, startDate, endDate]);

  useEffect(() => {
    fetchVisitors();
  }, [fetchVisitors]);

  const handleInitiateCheckout = (visitor: VisitorItem) => {
    setCheckoutVisitor({
      id_visitor: visitor.id_visitor,
      id_pass: visitor.id_pass,
      no_pass: visitor.no_pass || String(visitor.id_pass),
      fullname: visitor.fullname,
      institution: visitor.institution,
      representing: visitor.representing,
      purpose: visitor.purpose,
      check_in_at: visitor.check_in_at || new Date().toISOString(),
      capture_id: visitor.capture_id,
    });
    setShowCheckoutModal(true);
  };

  const handleConfirmCheckout = async (visitorId: number, notes?: string) => {
    setProcessingCheckout(true);
    try {
      const res = await api.post(`/visitors/${visitorId}/checkout`, { notes });
      setShowCheckoutModal(false);
      setCheckoutVisitor(null);
      setFeedback({
        type: 'success',
        text: res.data.message || 'Check-out tamu berhasil dan kartu pass telah dikembalikan ke status tersedia.',
      });
      fetchVisitors();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal memproses check-out pengunjung.';
      setFeedback({ type: 'error', text: msg });
    } finally {
      setProcessingCheckout(false);
    }
  };

  const filteredVisitors = visitors.filter((v) => {
    if (selectedReceptionist === 'Semua resepsionis') return true;
    const repName = v.approved_by || v.rejected_by || 'Petugas Resepsionis';
    return repName.toLowerCase() === selectedReceptionist.toLowerCase();
  });

  const handleExportExcel = async () => {
    setDownloadingExport('excel');
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const res = await api.get(`/visitors/export/excel?${params.toString()}`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Laporan_Kunjungan_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      setFeedback({
        type: 'error',
        text: 'Gagal mengunduh berkas Excel. Silakan coba kembali.',
      });
    } finally {
      setDownloadingExport(null);
    }
  };

  const handleExportPDF = async () => {
    setDownloadingExport('pdf');
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const res = await api.get(`/visitors/export/pdf?${params.toString()}`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], {
        type: 'application/pdf',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Laporan_Kunjungan_${new Date().toISOString().slice(0, 10)}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      setFeedback({
        type: 'error',
        text: 'Gagal mengunduh berkas PDF. Silakan coba kembali.',
      });
    } finally {
      setDownloadingExport(null);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-extrabold text-[#3B0A11] tracking-tight">
        Laporan Kunjungan
      </h1>

      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-center justify-between shadow-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-red-50 border-red-300 text-red-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span className="font-semibold">{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-bold text-gray-500 hover:text-gray-800 px-2 py-1 cursor-pointer"
            aria-label="Tutup notifikasi"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <button
            type="button"
            onClick={() => setDateFilterOpen(!dateFilterOpen)}
            className="inline-flex items-center space-x-2 bg-white border-2 border-black rounded-full px-4 py-1.5 text-xs font-semibold text-gray-800 shadow-xs hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A001A]"
            aria-expanded={dateFilterOpen}
          >
            <Calendar className="w-3.5 h-3.5 text-gray-700" />
            <span>
              {startDate && endDate
                ? `${startDate.slice(8, 10)}/${startDate.slice(5, 7)} – ${endDate.slice(8, 10)}/${endDate.slice(5, 7)}/${endDate.slice(0, 4)}`
                : '01/11 – 10/11/2026'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-700 ml-1" />
          </button>

          {dateFilterOpen && (
            <div className="absolute left-0 mt-2 p-3 bg-white border border-gray-300 rounded-2xl shadow-xl z-20 space-y-2 w-64">
              <div className="text-[11px] font-bold text-gray-700">Pilih Rentang Tanggal:</div>
              <div className="space-y-1">
                <label htmlFor="filter-start-date" className="text-[10px] text-gray-500">Mulai:</label>
                <input
                  id="filter-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-[#8A001A]"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="filter-end-date" className="text-[10px] text-gray-500">Selesai:</label>
                <input
                  id="filter-end-date"
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-[#8A001A]"
                />
              </div>

              {dateError && (
                <div role="alert" className="text-[10px] text-red-600 font-semibold bg-red-50 p-1.5 rounded-lg border border-red-200">
                  {dateError}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setDateError('');
                    setDateFilterOpen(false);
                  }}
                  className="text-[10px] text-gray-500 hover:text-gray-800 px-2 py-1 cursor-pointer"
                >
                  Reset
                </button>
                <button
                  type="button"
                  disabled={Boolean(dateError) || Boolean(startDate && endDate && endDate < startDate)}
                  onClick={() => setDateFilterOpen(false)}
                  className="text-[10px] bg-[#8A001A] text-white font-bold px-3 py-1 rounded-lg disabled:opacity-50 cursor-pointer"
                >
                  Terapkan
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setReceptionistFilterOpen(!receptionistFilterOpen)}
            className="inline-flex items-center space-x-2 bg-white border-2 border-black rounded-full px-4 py-1.5 text-xs font-semibold text-gray-800 shadow-xs hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A001A]"
            aria-expanded={receptionistFilterOpen}
          >
            <span>{selectedReceptionist}</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-700 ml-1" />
          </button>

          {receptionistFilterOpen && (
            <div className="absolute left-0 mt-2 py-1 bg-white border border-gray-300 rounded-2xl shadow-xl z-20 w-48 text-xs">
              {['Semua resepsionis', 'Rina', 'Dina', 'Tasha', 'Petugas Resepsionis'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setSelectedReceptionist(r);
                    setReceptionistFilterOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 font-medium text-gray-800 transition-colors cursor-pointer"
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama / instansi / no. pass"
            aria-label="Cari nama, instansi, atau nomor pass tamu"
            className="w-full bg-white border-2 border-black rounded-full pl-11 pr-4 py-2 text-xs text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30 shadow-xs font-medium"
          />
        </div>

        <div className="flex items-center space-x-2.5 shrink-0">
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={downloadingExport !== null}
            className="px-5 py-2 rounded-full text-xs font-bold text-white bg-[#5E6D74] hover:bg-[#505D63] disabled:opacity-60 shadow-xs transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#5E6D74]"
          >
            {downloadingExport === 'excel' ? 'Mengunduh...' : 'Ekspor Excel'}
          </button>
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={downloadingExport !== null}
            className="px-5 py-2 rounded-full text-xs font-bold text-white bg-[#8A001A] hover:bg-[#700015] disabled:opacity-60 shadow-xs transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#8A001A]"
          >
            {downloadingExport === 'pdf' ? 'Mengunduh...' : 'Ekspor PDF'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto pt-2">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-400">
              <th scope="col" className="py-2.5 px-3 text-sm font-bold italic underline text-[#4A000E]">Foto</th>
              <th scope="col" className="py-2.5 px-3 text-sm font-bold italic underline text-[#4A000E]">Tanggal</th>
              <th scope="col" className="py-2.5 px-3 text-sm font-bold italic underline text-[#4A000E]">Nama</th>
              <th scope="col" className="py-2.5 px-3 text-sm font-bold italic underline text-[#4A000E]">Instansi</th>
              <th scope="col" className="py-2.5 px-3 text-sm font-bold italic underline text-[#4A000E]">Keperluan</th>
              <th scope="col" className="py-2.5 px-3 text-sm font-bold italic underline text-[#4A000E] text-center">No. pass</th>
              <th scope="col" className="py-2.5 px-3 text-sm font-bold italic underline text-[#4A000E]">Masuk</th>
              <th scope="col" className="py-2.5 px-3 text-sm font-bold italic underline text-[#4A000E]">Keluar</th>
              <th scope="col" className="py-2.5 px-3 text-sm font-bold italic underline text-[#4A000E]">Resepsionis</th>
              {!isAdmin && (
                <th scope="col" className="py-2.5 px-3 text-sm font-bold italic underline text-[#4A000E] text-center">Aksi</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300/80 text-xs text-gray-800">
            {loading ? (
              <tr>
                <td colSpan={isAdmin ? 9 : 10} className="py-12 text-center text-gray-500 font-medium">
                  <div className="w-6 h-6 border-2 border-[#8A001A] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <span>Memuat data laporan...</span>
                </td>
              </tr>
            ) : filteredVisitors.length > 0 ? (
              filteredVisitors.map((v) => {
                const checkInDate = v.check_in_at ? new Date(v.check_in_at) : new Date();
                const day = String(checkInDate.getDate()).padStart(2, '0');
                const month = String(checkInDate.getMonth() + 1).padStart(2, '0');
                const year = checkInDate.getFullYear();
                const dateDisplay = `${day}/${month}/${year}`;

                const inHours = String(checkInDate.getHours()).padStart(2, '0');
                const inMinutes = String(checkInDate.getMinutes()).padStart(2, '0');
                const inTimeDisplay = `${inHours}.${inMinutes}`;

                let outTimeDisplay = '-';
                if (v.check_out_at) {
                  const checkOutDate = new Date(v.check_out_at);
                  const outHours = String(checkOutDate.getHours()).padStart(2, '0');
                  const outMinutes = String(checkOutDate.getMinutes()).padStart(2, '0');
                  outTimeDisplay = `${outHours}.${outMinutes}`;
                }

                const passNo = (v.no_pass || String(v.id_pass)).padStart(2, '0');
                const isCurrentlyActive = !v.check_out_at;

                return (
                  <tr key={v.id_visitor} className="hover:bg-black/5 transition-colors">
                    <td className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => setPreviewPhotoUrl(getVisitorPhotoUrl(v.id_visitor))}
                        className="w-10 h-10 rounded-full overflow-hidden bg-gray-400 flex items-center justify-center cursor-pointer shrink-0 border border-gray-400 shadow-2xs group relative focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A001A]"
                        title={`Lihat foto ${v.fullname}`}
                        aria-label={`Perbesar foto ${v.fullname}`}
                      >
                        <User className="w-6 h-6 text-gray-200 absolute" />
                        <img
                          src={getVisitorPhotoUrl(v.id_visitor)}
                          alt={v.fullname}
                          className="w-full h-full object-cover relative z-10 group-hover:scale-110 transition-transform"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      </button>
                    </td>

                    <td className="py-3 px-3 font-medium text-gray-800 whitespace-nowrap">
                      {dateDisplay}
                    </td>

                    <td className="py-3 px-3 font-semibold text-gray-900 whitespace-nowrap">
                      {v.fullname}
                    </td>

                    <td className="py-3 px-3 text-gray-800 font-medium">
                      {v.institution || '-'}
                    </td>

                    <td className="py-3 px-3 text-gray-800 font-medium max-w-xs truncate" title={v.purpose}>
                      {v.purpose || '-'}
                    </td>

                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="inline-block bg-[#4A000E] text-white font-extrabold text-xs px-3.5 py-0.5 rounded-full shadow-2xs min-w-[36px]">
                        {passNo}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-medium text-gray-800 whitespace-nowrap">
                      {inTimeDisplay}
                    </td>

                    <td className="py-3 px-3 font-medium text-gray-800 whitespace-nowrap">
                      {outTimeDisplay}
                    </td>

                    <td className="py-3 px-3 text-gray-800 font-medium whitespace-nowrap">
                      {v.approved_by || v.rejected_by || (v.status === 'APPROVED' ? 'Petugas Resepsionis' : '-')}
                    </td>

                    {!isAdmin && (
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {v.status === 'REJECTED' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300" title={v.rejection_reason ? `Alasan: ${v.rejection_reason}` : 'Permohonan ditolak'}>
                            Ditolak
                          </span>
                        ) : v.status === 'PENDING' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            Menunggu
                          </span>
                        ) : isCurrentlyActive ? (
                          <button
                            type="button"
                            onClick={() => handleInitiateCheckout(v)}
                            className="inline-flex items-center space-x-1.5 bg-[#8A001A] hover:bg-[#700015] text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-xs transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#8A001A]"
                            title="Proses check-out dan kembalikan kartu pass"
                          >
                            <LogOut className="w-3 h-3" />
                            <span>Check-Out</span>
                          </button>
                        ) : (
                          <span className="text-gray-500 font-medium text-xs italic">
                            Selesai
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={isAdmin ? 9 : 10} className="py-12 text-center text-gray-500 font-medium">
                  Tidak ada data kunjungan yang sesuai dengan filter pencarian.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {previewPhotoUrl && (
        <div
          onClick={() => setPreviewPhotoUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white rounded-3xl overflow-hidden shadow-2xl max-w-sm w-full border border-gray-200 p-4 space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <h2 className="text-xs font-bold text-gray-800">Foto Pengunjung</h2>
              <button
                type="button"
                onClick={() => setPreviewPhotoUrl(null)}
                className="p-1 rounded-full text-gray-500 hover:text-gray-800 cursor-pointer"
                aria-label="Tutup pratinjau foto"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center relative">
              <User className="w-12 h-12 text-gray-400 absolute" />
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
              type="button"
              onClick={() => setPreviewPhotoUrl(null)}
              className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-xl cursor-pointer"
            >
              Tutup Pratinjau
            </button>
          </div>
        </div>
      )}

      <CheckoutConfirmModal
        isOpen={showCheckoutModal}
        visitor={checkoutVisitor}
        onClose={() => {
          setShowCheckoutModal(false);
          setCheckoutVisitor(null);
        }}
        onConfirm={handleConfirmCheckout}
        loading={processingCheckout}
      />
    </div>
  );
}
