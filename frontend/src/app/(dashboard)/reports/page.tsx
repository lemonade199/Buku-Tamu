'use client';

import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { VisitorItem } from '@/types';
import {
  FileSpreadsheet,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  Download,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export default function ReportsPage() {
  const [visitors, setVisitors] = useState<VisitorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 15;

  // Photo modal
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  const fetchVisitors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      params.append('page', String(page));
      params.append('limit', String(limit));

      const res = await api.get<{
        success: boolean;
        data: VisitorItem[];
        meta: { page: number; limit: number; total: number };
      }>(`/visitors?${params.toString()}`);

      setVisitors(res.data.data || []);
      if (res.data.meta) {
        setTotalCount(res.data.meta.total);
        setTotalPages(Math.ceil(res.data.meta.total / limit) || 1);
      }
    } catch (err) {
      console.error('Gagal mengambil laporan kunjungan:', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, startDate, endDate, page]);

  useEffect(() => {
    fetchVisitors();
  }, [fetchVisitors]);

  // Export to CSV directly from live database data
  const handleExportCSV = () => {
    if (visitors.length === 0) return;

    const headers = [
      'ID',
      'No. Pass',
      'Nama Pengunjung',
      'Telepon',
      'Instansi',
      'Pihak Dituju',
      'Keperluan',
      'Waktu Check-In',
      'Waktu Check-Out',
      'Status',
    ];

    const rows = visitors.map((v) => [
      v.id_visitor,
      `Pass #${v.no_pass || v.id_pass}`,
      `"${v.fullname.replace(/"/g, '""')}"`,
      `"${v.telephone || '-'}"`,
      `"${(v.institution || '-').replace(/"/g, '""')}"`,
      `"${(v.representing || '-').replace(/"/g, '""')}"`,
      `"${(v.purpose || '-').replace(/"/g, '""')}"`,
      v.check_in_at ? new Date(v.check_in_at).toLocaleString('id-ID') : '-',
      v.check_out_at ? new Date(v.check_out_at).toLocaleString('id-ID') : 'Masih di lokasi',
      v.is_active ? 'Aktif' : 'Selesai',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Kunjungan_BukuTamu_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-charcoal tracking-tight flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-brand-500" />
            <span>Laporan & Riwayat Kunjungan</span>
          </h2>
          <p className="text-xs text-charcoal-muted mt-0.5">
            Arsip riwayat kunjungan tamu digital langsung dari database institusi
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchVisitors}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-ivory-200 text-charcoal text-xs font-medium rounded-lg shadow-sm hover:bg-ivory-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-500' : ''}`} />
            <span>Perbarui</span>
          </button>
          <button
            onClick={handleExportCSV}
            disabled={visitors.length === 0}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-lg shadow transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-ivory-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          {/* Search */}
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Cari nama pengunjung, nomor pass, instansi..."
              className="w-full pl-9 pr-3 py-2 border border-ivory-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setPage(1);
              }}
              className="w-full py-2 px-3 border border-ivory-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 font-medium"
            >
              <option value="ALL">Semua Status Kunjungan</option>
              <option value="ACTIVE">Sedang di Lokasi (Aktif)</option>
              <option value="COMPLETED">Sudah Check-Out (Selesai)</option>
            </select>
          </div>

          {/* Date Picker Start */}
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full py-1.5 px-2.5 border border-ivory-200 rounded-xl bg-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              title="Dari Tanggal"
            />
            <span className="text-charcoal-muted">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full py-1.5 px-2.5 border border-ivory-200 rounded-xl bg-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              title="Sampai Tanggal"
            />
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-ivory-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-ivory-200 flex items-center justify-between bg-ivory-50/50">
          <span className="text-xs font-bold text-charcoal">
            Total Ditemukan: <span className="text-brand-500">{totalCount} Kunjungan</span>
          </span>
          <span className="text-[11px] text-charcoal-muted">
            Halaman {page} dari {totalPages}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-ivory-100/70 text-[11px] uppercase tracking-wider text-charcoal-muted font-bold border-b border-ivory-200">
                <th className="py-3 px-4">Pass</th>
                <th className="py-3 px-4">Pengunjung</th>
                <th className="py-3 px-4">Instansi</th>
                <th className="py-3 px-4">Pihak Dituju & Keperluan</th>
                <th className="py-3 px-4">Waktu Check-In</th>
                <th className="py-3 px-4">Waktu Check-Out</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-charcoal-muted">
                    <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Memuat data riwayat dari database...</span>
                  </td>
                </tr>
              ) : visitors.length > 0 ? (
                visitors.map((visitor) => (
                  <tr key={visitor.id_visitor} className="hover:bg-ivory-50/70 transition-colors">
                    {/* Pass */}
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-brand-900 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                        #{visitor.no_pass || visitor.id_pass}
                      </span>
                    </td>

                    {/* Visitor */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2.5">
                        <div
                          onClick={() => setPreviewPhotoUrl(`${API_BASE_URL}/visitors/${visitor.id_visitor}/photo`)}
                          className="w-8 h-8 rounded-lg bg-gray-100 overflow-hidden border border-ivory-200 cursor-pointer shrink-0"
                          title="Klik zoom foto"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`${API_BASE_URL}/visitors/${visitor.id_visitor}/photo`}
                            alt={visitor.fullname}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                        <div>
                          <div className="font-semibold text-charcoal">{visitor.fullname}</div>
                          <div className="text-[10px] text-charcoal-muted font-mono">{visitor.telephone || '-'}</div>
                        </div>
                      </div>
                    </td>

                    {/* Institution */}
                    <td className="py-3 px-4 text-charcoal">
                      {visitor.institution || '-'}
                    </td>

                    {/* Representing & Purpose */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-charcoal">{visitor.representing || '-'}</div>
                      <div className="text-[11px] text-charcoal-muted truncate" title={visitor.purpose}>
                        {visitor.purpose || '-'}
                      </div>
                    </td>

                    {/* Check In */}
                    <td className="py-3 px-4 font-mono text-[11px] text-charcoal">
                      {visitor.check_in_at
                        ? new Date(visitor.check_in_at).toLocaleString('id-ID', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })
                        : '-'}
                    </td>

                    {/* Check Out */}
                    <td className="py-3 px-4 font-mono text-[11px] text-charcoal">
                      {visitor.check_out_at ? (
                        new Date(visitor.check_out_at).toLocaleString('id-ID', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })
                      ) : (
                        <span className="text-amber-600 font-semibold italic text-[10px]">
                          Sedang berkunjung
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      {visitor.is_active ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Selesai
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-charcoal-muted">
                    Tidak ada data kunjungan yang cocok dengan filter yang ditentukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-ivory-200 flex items-center justify-between bg-ivory-50/30">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="px-3 py-1.5 bg-white border border-ivory-200 rounded-lg text-xs font-semibold text-charcoal hover:bg-ivory-100 disabled:opacity-40 transition-colors flex items-center space-x-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Sebelumnya</span>
            </button>

            <span className="text-xs text-charcoal-muted font-medium">
              Halaman <strong>{page}</strong> dari <strong>{totalPages}</strong>
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="px-3 py-1.5 bg-white border border-ivory-200 rounded-lg text-xs font-semibold text-charcoal hover:bg-ivory-100 disabled:opacity-40 transition-colors flex items-center space-x-1"
            >
              <span>Selanjutnya</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Photo Zoom Modal */}
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
              <h4 className="text-xs font-bold text-charcoal">Foto Tamu</h4>
              <button
                onClick={() => setPreviewPhotoUrl(null)}
                className="p-1 rounded-full text-gray-500 hover:text-gray-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewPhotoUrl}
                alt="Zoom Tamu"
                className="w-full h-full object-cover"
              />
            </div>
            <button
              onClick={() => setPreviewPhotoUrl(null)}
              className="w-full py-2 bg-ivory-100 hover:bg-ivory-200 text-charcoal text-xs font-semibold rounded-xl"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
