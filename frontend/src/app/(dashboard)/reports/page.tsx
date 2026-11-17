'use client';

import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { VisitorItem } from '@/types';
import {
  Search,
  Calendar,
  ChevronDown,
  User,
  X,
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export default function ReportsPage() {
  const [visitors, setVisitors] = useState<VisitorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilterOpen, setDateFilterOpen] = useState(false);
  const [receptionistFilterOpen, setReceptionistFilterOpen] = useState(false);
  const [selectedReceptionist, setSelectedReceptionist] = useState<string>('Semua resepsionis');

  // Date range states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateError, setDateError] = useState('');

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

  // Photo modal zoom
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

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

  // Export to CSV / Excel
  const handleExportExcel = () => {
    if (visitors.length === 0) return;

    const headers = [
      'No. Pass',
      'Tanggal',
      'Nama Pengunjung',
      'Instansi',
      'Keperluan',
      'Waktu Masuk',
      'Waktu Keluar',
      'Resepsionis',
    ];

    const rows = visitors.map((v) => {
      const d = v.check_in_at ? new Date(v.check_in_at) : new Date();
      const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      const inTime = v.check_in_at
        ? `${String(new Date(v.check_in_at).getHours()).padStart(2, '0')}.${String(new Date(v.check_in_at).getMinutes()).padStart(2, '0')}`
        : '-';
      const outTime = v.check_out_at
        ? `${String(new Date(v.check_out_at).getHours()).padStart(2, '0')}.${String(new Date(v.check_out_at).getMinutes()).padStart(2, '0')}`
        : 'Sedang berkunjung';

      return [
        `Pass #${v.no_pass || v.id_pass}`,
        dateStr,
        `"${v.fullname.replace(/"/g, '""')}"`,
        `"${(v.institution || '-').replace(/"/g, '""')}"`,
        `"${(v.purpose || '-').replace(/"/g, '""')}"`,
        inTime,
        outTime,
        'Rina',
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Kunjungan_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Page Title */}
      <h1 className="text-3xl font-extrabold text-[#3B0A11] tracking-tight">
        Laporan Kunjungan
      </h1>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Date Filter Pill */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setDateFilterOpen(!dateFilterOpen)}
            className="inline-flex items-center space-x-2 bg-white border border-gray-900 rounded-full px-4 py-1.5 text-xs font-semibold text-gray-800 shadow-xs hover:bg-gray-50 transition-colors"
          >
            <Calendar className="w-3.5 h-3.5 text-gray-700" />
            <span>
              {startDate && endDate
                ? `${startDate.slice(8, 10)}/${startDate.slice(5, 7)} – ${endDate.slice(8, 10)}/${endDate.slice(5, 7)}/${endDate.slice(0, 4)}`
                : '01/11 – 10/11/2026'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-700 ml-1" />
          </button>

          {/* Date Picker Dropdown Popup */}
          {dateFilterOpen && (
            <div className="absolute left-0 mt-2 p-3 bg-white border border-gray-300 rounded-2xl shadow-xl z-20 space-y-2 w-64 animate-fadeIn">
              <div className="text-[11px] font-bold text-gray-700">Pilih Rentang Tanggal:</div>
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500">Mulai:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-[#8A001A]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500">Selesai:</label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-[#8A001A]"
                />
              </div>

              {dateError && (
                <div className="text-[10px] text-red-600 font-semibold bg-red-50 p-1.5 rounded-lg border border-red-200">
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
                  className="text-[10px] text-gray-500 hover:text-gray-800 px-2 py-1"
                >
                  Reset
                </button>
                <button
                  type="button"
                  disabled={Boolean(dateError) || Boolean(startDate && endDate && endDate < startDate)}
                  onClick={() => setDateFilterOpen(false)}
                  className="text-[10px] bg-[#8A001A] text-white font-bold px-3 py-1 rounded-lg disabled:opacity-50"
                >
                  Terapkan
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Receptionist Filter Pill */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setReceptionistFilterOpen(!receptionistFilterOpen)}
            className="inline-flex items-center space-x-2 bg-white border border-gray-900 rounded-full px-4 py-1.5 text-xs font-semibold text-gray-800 shadow-xs hover:bg-gray-50 transition-colors"
          >
            <span>{selectedReceptionist}</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-700 ml-1" />
          </button>

          {receptionistFilterOpen && (
            <div className="absolute left-0 mt-2 py-1 bg-white border border-gray-300 rounded-2xl shadow-xl z-20 w-48 animate-fadeIn text-xs">
              {['Semua resepsionis', 'Rina', 'Tasha', 'Petugas Resepsionis'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setSelectedReceptionist(r);
                    setReceptionistFilterOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 font-medium text-gray-800 transition-colors"
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Search Bar & Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama / instansi / no. pass"
            className="w-full bg-white border border-gray-900 rounded-full pl-11 pr-4 py-2 text-xs text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30 shadow-xs font-medium"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2.5 shrink-0">
          <button
            onClick={handleExportExcel}
            className="px-5 py-2 rounded-full text-xs font-bold text-white bg-[#5E6D74] hover:bg-[#505D63] shadow-xs transition-colors"
          >
            Ekspor Excel
          </button>
          <button
            onClick={handleExportPDF}
            className="px-5 py-2 rounded-full text-xs font-bold text-white bg-[#8A001A] hover:bg-[#700015] shadow-xs transition-colors"
          >
            Ekspor PDF
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto pt-2">
        <table className="w-full text-left border-collapse">
          {/* Table Header with styled underline, bold and italic */}
          <thead>
            <tr className="border-b border-gray-400">
              <th className="py-2.5 px-3 text-sm font-bold italic underline text-[#4A000E]">Foto</th>
              <th className="py-2.5 px-3 text-sm font-bold italic underline text-[#4A000E]">Tanggal</th>
              <th className="py-2.5 px-3 text-sm font-bold italic underline text-[#4A000E]">Nama</th>
              <th className="py-2.5 px-3 text-sm font-bold italic underline text-[#4A000E]">Instansi</th>
              <th className="py-2.5 px-3 text-sm font-bold italic underline text-[#4A000E]">Keperluan</th>
              <th className="py-2.5 px-3 text-sm font-bold italic underline text-[#4A000E] text-center">No. pass</th>
              <th className="py-2.5 px-3 text-sm font-bold italic underline text-[#4A000E]">Masuk</th>
              <th className="py-2.5 px-3 text-sm font-bold italic underline text-[#4A000E]">Keluar</th>
              <th className="py-2.5 px-3 text-sm font-bold italic underline text-[#4A000E]">Resepsionis</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300/80 text-xs text-gray-800">
            {loading ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-gray-500 font-medium">
                  <div className="w-6 h-6 border-2 border-[#8A001A] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <span>Memuat data laporan...</span>
                </td>
              </tr>
            ) : visitors.length > 0 ? (
              visitors.map((v) => {
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

                const passNo = v.no_pass || String(v.id_pass);

                return (
                  <tr key={v.id_visitor} className="hover:bg-black/5 transition-colors">
                    {/* Foto */}
                    <td className="py-3 px-3">
                      <div
                        onClick={() => setPreviewPhotoUrl(`${API_BASE_URL}/visitors/${v.id_visitor}/photo`)}
                        className="w-10 h-10 rounded-full overflow-hidden bg-gray-400 flex items-center justify-center cursor-pointer shrink-0 border border-gray-400 shadow-2xs group relative"
                        title="Klik untuk memperbesar foto"
                      >
                        <User className="w-6 h-6 text-gray-200 absolute" />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`${API_BASE_URL}/visitors/${v.id_visitor}/photo`}
                          alt={v.fullname}
                          className="w-full h-full object-cover relative z-10 group-hover:scale-110 transition-transform"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    </td>

                    {/* Tanggal */}
                    <td className="py-3 px-3 font-medium text-gray-800 whitespace-nowrap">
                      {dateDisplay}
                    </td>

                    {/* Nama */}
                    <td className="py-3 px-3 font-semibold text-gray-900 whitespace-nowrap">
                      {v.fullname}
                    </td>

                    {/* Instansi */}
                    <td className="py-3 px-3 text-gray-800 font-medium">
                      {v.institution || '-'}
                    </td>

                    {/* Keperluan */}
                    <td className="py-3 px-3 text-gray-800 font-medium max-w-xs truncate" title={v.purpose}>
                      {v.purpose || '-'}
                    </td>

                    {/* No. Pass */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="inline-block bg-[#6B0014] text-white font-extrabold text-xs px-3.5 py-1 rounded-full shadow-2xs min-w-[36px]">
                        {passNo}
                      </span>
                    </td>

                    {/* Masuk */}
                    <td className="py-3 px-3 font-medium text-gray-800 whitespace-nowrap">
                      {inTimeDisplay}
                    </td>

                    {/* Keluar */}
                    <td className="py-3 px-3 font-medium text-gray-800 whitespace-nowrap">
                      {outTimeDisplay}
                    </td>

                    {/* Resepsionis */}
                    <td className="py-3 px-3 text-gray-800 font-medium whitespace-nowrap">
                      Rina
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="py-12 text-center text-gray-500 font-medium">
                  Tidak ada data kunjungan yang sesuai dengan filter pencarian.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Photo Zoom Modal */}
      {previewPhotoUrl && (
        <div
          onClick={() => setPreviewPhotoUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white rounded-3xl overflow-hidden shadow-2xl max-w-sm w-full border border-gray-200 p-4 space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <h4 className="text-xs font-bold text-gray-800">Foto Pengunjung</h4>
              <button
                onClick={() => setPreviewPhotoUrl(null)}
                className="p-1 rounded-full text-gray-500 hover:text-gray-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center relative">
              <User className="w-12 h-12 text-gray-400 absolute" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
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
              className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-xl"
            >
              Tutup Pratinjau
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
