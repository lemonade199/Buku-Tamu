'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { parseServerDate } from '@/lib/datetime';
import api, { getVisitorPhotoUrl } from '@/lib/api';
import { VisitorItem } from '@/types';
import MonthlyVisitsChart from '@/components/MonthlyVisitsChart';
import {
  Search,
  Calendar,
  ChevronDown,
  User,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAutoDismiss } from '@/hooks/useAutoDismiss';

export default function ReportsPage() {
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

  const [receptionistOptions, setReceptionistOptions] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  useAutoDismiss(feedback, () => setFeedback(null));

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
      // Laporan hanya berisi kunjungan selesai: tamu disetujui dan kartu pass sudah dikembalikan.
      params.append('status', 'COMPLETED');
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

  // Daftar resepsionis diambil dari database (akun aktif berperan resepsionis) untuk admin maupun resepsionis,
  // ditambah nama penyetuju yang benar-benar tercatat di data kunjungan.
  useEffect(() => {
    api
      .get<{ success: boolean; data: string[] }>('/auth/receptionists')
      .then((res) => setReceptionistOptions(res.data.data || []))
      .catch((err) => console.error('Gagal mengambil daftar resepsionis:', err));
  }, []);

  const receptionistChoices = Array.from(
    new Set([...receptionistOptions, ...visitors.map((v) => v.approved_by).filter((n): n is string => Boolean(n))])
  ).sort((a, b) => a.localeCompare(b, 'id'));

  const filteredVisitors = visitors.filter((v) => {
    if (selectedReceptionist === 'Semua resepsionis') return true;
    return (v.approved_by || '').toLowerCase() === selectedReceptionist.toLowerCase();
  });

  const handleExportExcel = async () => {
    setDownloadingExport('excel');
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      params.append('status', 'COMPLETED');

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
      params.append('status', 'COMPLETED');

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
      <h1 className="text-2xl sm:text-3xl font-bold text-[#3B0A11] tracking-tight">
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

      <MonthlyVisitsChart />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <button
            type="button"
            onClick={() => setDateFilterOpen(!dateFilterOpen)}
            className="inline-flex items-center space-x-2 bg-white border border-gray-300 rounded-full px-4 py-1.5 text-xs font-semibold text-gray-800 shadow-xs hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A001A]"
            aria-expanded={dateFilterOpen}
          >
            <Calendar className="w-3.5 h-3.5 text-gray-700" />
            <span>
              {startDate && endDate
                ? `${startDate.slice(8, 10)}/${startDate.slice(5, 7)} – ${endDate.slice(8, 10)}/${endDate.slice(5, 7)}/${endDate.slice(0, 4)}`
                : startDate
                ? `Mulai ${startDate.slice(8, 10)}/${startDate.slice(5, 7)}/${startDate.slice(0, 4)}`
                : 'Semua tanggal'}
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
            className="inline-flex items-center space-x-2 bg-white border border-gray-300 rounded-full px-4 py-1.5 text-xs font-semibold text-gray-800 shadow-xs hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A001A]"
            aria-expanded={receptionistFilterOpen}
          >
            <span>{selectedReceptionist}</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-700 ml-1" />
          </button>

          {receptionistFilterOpen && (
            <div className="absolute left-0 mt-2 py-1 bg-white border border-gray-300 rounded-2xl shadow-xl z-20 w-52 max-h-60 overflow-y-auto text-xs">
              {['Semua resepsionis', ...receptionistChoices].map((r) => (
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
            className="w-full bg-white border border-gray-300 rounded-full pl-11 pr-4 py-2 text-xs text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30 focus:border-[#8A001A] shadow-xs font-medium"
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

      <div className="overflow-x-auto bg-white rounded-2xl border border-[#E8DCCB] shadow-sm">
        {/* Lebar kolom tetap supaya header dan isi selalu sejajar, sama dengan tabel di halaman lain. */}
        <table className="w-full min-w-[960px] table-fixed text-left border-collapse">
          <colgroup>
            <col className="w-[72px]" />
            <col className="w-[112px]" />
            <col className="w-[16%]" />
            <col className="w-[18%]" />
            <col className="w-[24%]" />
            <col className="w-[96px]" />
            <col className="w-[88px]" />
            <col className="w-[88px]" />
            <col />
          </colgroup>
          <thead>
            <tr className="border-b border-gray-200 bg-[#FAF7F0]">
              <th scope="col" className="px-4 py-3 text-xs font-semibold text-gray-600">Foto</th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold text-gray-600">Tanggal</th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold text-gray-600">Nama</th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold text-gray-600">Instansi</th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold text-gray-600">Keperluan</th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold text-gray-600 text-center whitespace-nowrap">No. pass</th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold text-gray-600 text-center">Masuk</th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold text-gray-600 text-center">Keluar</th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold text-gray-600 text-right">Resepsionis</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs text-gray-800">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-500">
                  Memuat data laporan...
                </td>
              </tr>
            ) : filteredVisitors.length > 0 ? (
              filteredVisitors.map((v) => {
                const checkInDate = parseServerDate(v.check_in_at) ?? new Date();
                const day = String(checkInDate.getDate()).padStart(2, '0');
                const month = String(checkInDate.getMonth() + 1).padStart(2, '0');
                const year = checkInDate.getFullYear();
                const dateDisplay = `${day}/${month}/${year}`;

                const inHours = String(checkInDate.getHours()).padStart(2, '0');
                const inMinutes = String(checkInDate.getMinutes()).padStart(2, '0');
                const inTimeDisplay = `${inHours}.${inMinutes}`;

                let outTimeDisplay = '-';
                if (v.check_out_at) {
                  const checkOutDate = parseServerDate(v.check_out_at) ?? new Date();
                  const outHours = String(checkOutDate.getHours()).padStart(2, '0');
                  const outMinutes = String(checkOutDate.getMinutes()).padStart(2, '0');
                  outTimeDisplay = `${outHours}.${outMinutes}`;
                }

                const passNo = (v.no_pass || String(v.id_pass)).padStart(2, '0');

                return (
                  <tr key={v.id_visitor} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setPreviewPhotoUrl(getVisitorPhotoUrl(v.id_visitor))}
                        className="relative w-9 h-9 rounded-full overflow-hidden bg-gray-400 flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A001A] hover:ring-2 hover:ring-[#8A001A]/40"
                        aria-label={`Perbesar foto ${v.fullname}`}
                      >
                        <User className="w-5 h-5 text-white absolute" aria-hidden="true" />
                        <img
                          src={getVisitorPhotoUrl(v.id_visitor)}
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
                    <td className="px-4 py-3 text-gray-700 tabular-nums whitespace-nowrap">{dateDisplay}</td>
                    <td className="px-4 py-3 font-bold text-gray-900 truncate" title={v.fullname}>
                      {v.fullname}
                    </td>
                    <td className="px-4 py-3 text-gray-700 truncate" title={v.institution || '-'}>
                      {v.institution || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-700 truncate" title={v.purpose || '-'}>
                      {v.purpose || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block px-3 py-0.5 bg-[#4A000E] text-white text-xs font-bold rounded-full tabular-nums">
                        {passNo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700 tabular-nums">{inTimeDisplay}</td>
                    <td className="px-4 py-3 text-center text-gray-700 tabular-nums">{outTimeDisplay}</td>
                    <td className="px-4 py-3 text-gray-700 truncate text-right" title={v.approved_by || '-'}>
                      {v.approved_by || '-'}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-500">
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

    </div>
  );
}
