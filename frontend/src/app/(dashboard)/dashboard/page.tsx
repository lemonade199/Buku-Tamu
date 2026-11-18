'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { DashboardMetrics, VisitorItem } from '@/types';
import {
  Users,
  UserCheck,
  UserX,
  CreditCard,
  Clock,
  PlusCircle,
  LogOut,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Hourglass,
  X,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import Link from 'next/link';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [pendingVisitors, setPendingVisitors] = useState<VisitorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chartView, setChartView] = useState<'HOURLY' | 'WEEKLY'>('HOURLY');

  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');

  const [approveTarget, setApproveTarget] = useState<VisitorItem | null>(null);
  const [approving, setApproving] = useState(false);

  const [rejectTarget, setRejectTarget] = useState<VisitorItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [metricRes, pendingRes] = await Promise.all([
        api.get<{ success: boolean; data: DashboardMetrics }>('/dashboard/metrics'),
        api.get<{ success: boolean; data: VisitorItem[] }>('/visitors/pending').catch(() => ({ data: { data: [] } })),
      ]);

      setMetrics(metricRes.data.data);
      setPendingVisitors(pendingRes.data.data || metricRes.data.data?.pending_visitors || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleConfirmApprove = async () => {
    if (!approveTarget) return;
    setApproving(true);
    setFeedback(null);
    try {
      const res = await api.post(`/visitors/${approveTarget.id_visitor}/approve`);
      setFeedback({
        type: 'success',
        text: res.data.message || `Registrasi tamu ${approveTarget.fullname} berhasil disetujui. Kartu pass sekarang IN_USE.`,
      });
      setApproveTarget(null);
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal menyetujui registrasi.';
      setFeedback({ type: 'error', text: msg });
    } finally {
      setApproving(false);
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
        text: res.data.message || `Registrasi tamu ${rejectTarget.fullname} telah ditolak. Kartu pass kembali AVAILABLE.`,
      });
      setRejectTarget(null);
      setRejectReason('');
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal menolak registrasi.';
      setFeedback({ type: 'error', text: msg });
    } finally {
      setRejecting(false);
    }
  };

  if (loading && !metrics) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-3">
        <div className="w-8 h-8 border-4 border-[#8A001A] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-gray-500 font-medium">Memuat data dashboard operasional...</p>
      </div>
    );
  }

  const totalPass = metrics?.total_pass || 20;
  const pendingCount = pendingVisitors.length;

  const hourlyData = metrics?.hourly_stats || [];
  const weeklyData = metrics?.weekly_trend || [];

  const passStats = metrics?.pass_stats || {
    AVAILABLE: metrics?.available_pass ?? 0,
    PENDING: metrics?.pending_pass ?? 0,
    IN_USE: metrics?.in_use_pass ?? 0,
    MAINTENANCE: 0,
    LOST: 0,
  };

  const passCompositionData = [
    { name: 'Tersedia', value: passStats.AVAILABLE ?? 0, color: '#10B981' },
    { name: 'Digunakan', value: passStats.IN_USE ?? 0, color: '#8A001A' },
    { name: 'Menunggu', value: passStats.PENDING ?? pendingCount ?? 0, color: '#F59E0B' },
    { name: 'Perbaikan / Hilang', value: (passStats.MAINTENANCE ?? 0) + (passStats.LOST ?? 0), color: '#9CA3AF' },
  ].filter((item) => item.value > 0);

  const totalPassCount = passCompositionData.reduce((acc, curr) => acc + curr.value, 0) || totalPass;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Dashboard Resepsionis</h1>
          <p className="text-xs text-gray-600 mt-0.5">
            Pusat persetujuan registrasi tamu mandiri dan pemantauan kartu pass
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-800 text-xs font-semibold rounded-xl shadow-2xs hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A001A]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#8A001A]' : ''}`} />
            <span>Perbarui</span>
          </button>
          <Link
            href="/"
            target="_blank"
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#8A001A] hover:bg-[#700015] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Kiosk Registrasi Tamu</span>
          </Link>
        </div>
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

      {pendingCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500 text-black border-2 border-amber-600 shadow-md flex items-center justify-between animate-pulse">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-black/20 flex items-center justify-center font-bold text-lg">
              ⚠️
            </div>
            <div>
              <p className="text-sm font-extrabold uppercase tracking-tight">
                Pemberitahuan Permohonan Tamu Baru!
              </p>
              <p className="text-xs font-medium mt-0.5">
                Terdapat <strong>{pendingCount} tamu</strong> sedang menunggu verifikasi dan persetujuan kartu pass Anda.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('PENDING')}
            className="px-4 py-2 bg-black text-white text-xs font-bold rounded-xl hover:bg-neutral-800 shadow transition-colors cursor-pointer"
          >
            Tinjau Sekarang
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-black text-white rounded-2xl p-5 shadow-sm relative overflow-hidden border-l-4 border-amber-400">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Menunggu Persetujuan</span>
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-amber-300">
              <Hourglass className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-3xl font-black tracking-tight text-white">{pendingCount}</p>
            <p className="text-[11px] text-gray-400 mt-1">Permohonan berstatus PENDING</p>
          </div>
        </div>

        <div className="bg-black text-white rounded-2xl p-5 shadow-sm relative overflow-hidden border-l-4 border-[#8A001A]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tamu Aktif di Lokasi</span>
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-rose-300">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-3xl font-black tracking-tight text-white">{metrics?.active_visitors ?? 0}</p>
            <p className="text-[11px] text-gray-400 mt-1">Kartu pass sedang digunakan (IN_USE)</p>
          </div>
        </div>

        <div className="bg-black text-white rounded-2xl p-5 shadow-sm relative overflow-hidden border-l-4 border-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pass Tersedia (Rak)</span>
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-emerald-300">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-3xl font-black tracking-tight text-white">{metrics?.available_pass ?? 0}</p>
            <p className="text-[11px] text-gray-400 mt-1">Siap dipilih tamu (AVAILABLE)</p>
          </div>
        </div>

        <div className="bg-black text-white rounded-2xl p-5 shadow-sm relative overflow-hidden border-l-4 border-gray-400">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Kunjungan Hari Ini</span>
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-gray-300">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-3xl font-black tracking-tight text-white">{metrics?.total_visitors_today ?? 0}</p>
            <p className="text-[11px] text-gray-400 mt-1">Total kunjungan disetujui</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-[#8A001A]" />
                <span>Statistik & Tren Kunjungan</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {chartView === 'HOURLY'
                  ? 'Distribusi kedatangan tamu per jam operasional hari ini'
                  : 'Tren total kunjungan harian dalam 7 hari terakhir'}
              </p>
            </div>
            <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setChartView('HOURLY')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  chartView === 'HOURLY'
                    ? 'bg-white text-gray-900 shadow-2xs font-bold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Per Jam
              </button>
              <button
                type="button"
                onClick={() => setChartView('WEEKLY')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  chartView === 'WEEKLY'
                    ? 'bg-white text-gray-900 shadow-2xs font-bold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                7 Hari Terakhir
              </button>
            </div>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartView === 'HOURLY' ? (
                <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={{ stroke: '#E5E7EB' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      color: '#FFFFFF',
                      borderRadius: '8px',
                      fontSize: '12px',
                      border: 'none',
                    }}
                    formatter={(value: any) => [`${value} Kunjungan`, 'Jumlah']}
                    labelFormatter={(label) => `Pukul ${label}`}
                  />
                  <Bar dataKey="count" fill="#8A001A" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              ) : (
                <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorWeekly" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8A001A" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#8A001A" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    tickLine={false}
                    axisLine={{ stroke: '#E5E7EB' }}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      color: '#FFFFFF',
                      borderRadius: '8px',
                      fontSize: '12px',
                      border: 'none',
                    }}
                    formatter={(value: any) => [`${value} Kunjungan`, 'Total']}
                    labelFormatter={(label, payload) => {
                      const item = payload?.[0]?.payload;
                      return `${label} (${item?.date || ''})`;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#8A001A"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorWeekly)"
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900 flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-[#8A001A]" />
              <span>Komposisi Rak Kartu Pass</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Alokasi dan ketersediaan fisik pass tamu
            </p>
          </div>

          <div className="h-44 w-full relative flex items-center justify-center my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={passCompositionData.length > 0 ? passCompositionData : [{ name: 'N/A', value: 1, color: '#E5E7EB' }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={68}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {(passCompositionData.length > 0 ? passCompositionData : [{ name: 'N/A', value: 1, color: '#E5E7EB' }]).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    color: '#FFFFFF',
                    borderRadius: '8px',
                    fontSize: '12px',
                    border: 'none',
                  }}
                  formatter={(value: any, name: any) => [`${value} Kartu`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-gray-900 leading-none">{totalPassCount}</span>
              <span className="text-[10px] text-gray-500 font-semibold uppercase mt-0.5">Total Pass</span>
            </div>
          </div>

          <div className="space-y-1.5 pt-1 border-t border-gray-100 text-xs">
            <div className="flex items-center justify-between text-gray-700">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>Tersedia (AVAILABLE)</span>
              </div>
              <span className="font-bold">{passStats.AVAILABLE ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-gray-700">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#8A001A]"></span>
                <span>Digunakan (IN_USE)</span>
              </div>
              <span className="font-bold">{passStats.IN_USE ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-gray-700">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span>Menunggu (PENDING)</span>
              </div>
              <span className="font-bold">{passStats.PENDING ?? pendingCount ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-gray-900 flex items-center space-x-2">
              <Hourglass className="w-4 h-4 text-[#8A001A]" />
              <span>Kelola Permohonan Registrasi Tamu</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Setujui atau tolak permohonan kunjungan tamu secara atomik dan realtime
            </p>
          </div>

          <div className="flex items-center space-x-1.5 bg-gray-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('PENDING')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'PENDING'
                  ? 'bg-white text-gray-900 shadow-2xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Menunggu ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('APPROVED')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'APPROVED'
                  ? 'bg-white text-gray-900 shadow-2xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Aktif di Lokasi ({metrics?.active_visitors ?? 0})
            </button>
          </div>
        </div>

        {activeTab === 'PENDING' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase tracking-wider text-[11px]">
                  <th scope="col" className="py-3 px-4">Foto</th>
                  <th scope="col" className="py-3 px-4">Nama Tamu</th>
                  <th scope="col" className="py-3 px-4">Instansi</th>
                  <th scope="col" className="py-3 px-4">Keperluan</th>
                  <th scope="col" className="py-3 px-4 text-center">Kartu Dipilih</th>
                  <th scope="col" className="py-3 px-4">Waktu Registrasi</th>
                  <th scope="col" className="py-3 px-4 text-center w-52">Aksi Resepsionis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingVisitors.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-500 font-medium">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2 font-bold">
                        ✓
                      </div>
                      <p className="font-semibold text-gray-800">Tidak ada permohonan yang menunggu.</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">Semua registrasi tamu telah diproses.</p>
                    </td>
                  </tr>
                ) : (
                  pendingVisitors.map((v) => (
                    <tr key={v.id_visitor} className="hover:bg-amber-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => setSelectedPhotoUrl(`${API_BASE_URL}/visitors/${v.id_visitor}/photo`)}
                          className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 border border-gray-300 shadow-2xs flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
                          title="Lihat foto tamu"
                          aria-label={`Lihat foto ${v.fullname}`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`${API_BASE_URL}/visitors/${v.id_visitor}/photo`}
                            alt={v.fullname}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                        </button>
                      </td>

                      <td className="py-3 px-4 font-bold text-gray-900 whitespace-nowrap">
                        {v.fullname}
                      </td>

                      <td className="py-3 px-4 text-gray-700 font-medium">
                        {v.institution || '-'}
                      </td>

                      <td className="py-3 px-4 text-gray-700 max-w-xs truncate" title={v.purpose || ''}>
                        {v.purpose || '-'}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-[#6B0014] text-white shadow-2xs">
                          #{v.no_pass}
                        </span>
                        <span className="block text-[10px] font-bold text-amber-700 mt-0.5">
                          PENDING
                        </span>
                      </td>

                      <td className="py-3 px-4 text-gray-600 font-mono text-[11px] whitespace-nowrap">
                        {new Date(v.check_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            type="button"
                            onClick={() => setApproveTarget(v)}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-[#1B5E20] hover:bg-[#144718] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5E20]"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Setujui</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectTarget(v);
                              setRejectReason('');
                            }}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-gray-200 hover:bg-rose-100 hover:text-rose-800 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>Tolak</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'APPROVED' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase tracking-wider text-[11px]">
                  <th scope="col" className="py-3 px-4">No Pass</th>
                  <th scope="col" className="py-3 px-4">Nama Pengunjung</th>
                  <th scope="col" className="py-3 px-4">Instansi</th>
                  <th scope="col" className="py-3 px-4">Keperluan</th>
                  <th scope="col" className="py-3 px-4">Waktu Masuk</th>
                  <th scope="col" className="py-3 px-4 text-center">Status Kartu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {metrics?.recent_visitors && metrics.recent_visitors.length > 0 ? (
                  metrics.recent_visitors.map((visitor) => (
                    <tr key={visitor.id_visitor} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-block bg-[#6B0014] text-white font-extrabold text-xs px-3 py-0.5 rounded-full shadow-2xs">
                          #{visitor.no_pass || visitor.id_pass}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-900 whitespace-nowrap">
                        {visitor.fullname}
                      </td>
                      <td className="py-3 px-4 text-gray-700 font-medium">
                        {visitor.institution || '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-700 max-w-xs truncate" title={visitor.purpose || ''}>
                        {visitor.purpose || '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-600 font-mono text-[11px] whitespace-nowrap">
                        {new Date(visitor.check_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#8A001A]/10 text-[#8A001A] border border-[#8A001A]/20">
                          IN_USE (Di Lokasi)
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-gray-500 font-medium">
                      Belum ada pengunjung aktif saat ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Status Kartu Pass Rak Fisik</h3>
            <Link href="/pass" className="text-xs font-semibold text-[#8A001A] hover:underline">
              Buka Rak Pass →
            </Link>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="flex items-center text-gray-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2" />
                  Tersedia di Rak (AVAILABLE)
                </span>
                <span className="font-bold text-emerald-700">
                  {metrics?.available_pass ?? 0} / {totalPass}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, ((metrics?.available_pass ?? 0) / totalPass) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="flex items-center text-gray-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 mr-2" />
                  Menunggu Persetujuan (PENDING)
                </span>
                <span className="font-bold text-amber-700">
                  {metrics?.pending_pass ?? pendingCount}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (((metrics?.pending_pass ?? pendingCount)) / totalPass) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="flex items-center text-gray-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#8A001A] mr-2" />
                  Sedang Digunakan Tamu (IN_USE)
                </span>
                <span className="font-bold text-[#8A001A]">
                  {metrics?.in_use_pass ?? 0}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-[#8A001A] h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, ((metrics?.in_use_pass ?? 0) / totalPass) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-gray-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">Pintasan Manajemen Kunjungan</h3>
            <p className="text-xs text-gray-500 mb-4">
              Akses cepat laporan rekapitulasi, monitoring rak pass, dan kontrol tamu
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href="/pass"
                className="p-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-rose-50/50 hover:border-[#8A001A]/30 transition-all flex items-start space-x-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-[#8A001A] text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 group-hover:text-[#8A001A] transition-colors">
                    Monitoring Kartu Pass
                  </h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Pantau nomor kartu dan ubah kondisi kartu fisik
                  </p>
                </div>
              </Link>

              <Link
                href="/reports"
                className="p-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-rose-50/50 hover:border-[#8A001A]/30 transition-all flex items-start space-x-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-[#5E6D74] text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 group-hover:text-[#8A001A] transition-colors">
                    Laporan & Check-Out
                  </h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Ekspor Excel/PDF dan proses kepulangan tamu
                  </p>
                </div>
              </Link>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
            <span className="flex items-center space-x-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-[#8A001A]" />
              <span>Jam Operasional: <strong>08:00 - 17:00 WIB</strong></span>
            </span>
            <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
              POSKO AKTIF
            </span>
          </div>
        </div>
      </div>

      {approveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-gray-200 p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center font-bold">
              <UserCheck className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-gray-900">Setujui Permohonan Tamu</h3>
              <p className="text-xs text-gray-600">
                Apakah Anda yakin ingin menyetujui registrasi tamu berikut?
              </p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">Nama:</span>
                <span className="font-bold text-gray-900">{approveTarget.fullname}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Instansi:</span>
                <span className="font-semibold text-gray-800">{approveTarget.institution || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Kartu Pass:</span>
                <span className="font-mono font-bold text-[#8A001A]">Pass #{approveTarget.no_pass}</span>
              </div>
            </div>

            <p className="text-[11px] text-gray-500 text-center leading-relaxed">
              Setelah disetujui, status kunjungan menjadi <strong>APPROVED</strong> dan status kartu pass menjadi <strong>IN_USE</strong>.
            </p>

            <div className="flex space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setApproveTarget(null)}
                disabled={approving}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                disabled={approving}
                className="flex-1 py-2.5 bg-[#1B5E20] hover:bg-[#144718] text-white font-bold text-xs rounded-xl disabled:opacity-50 cursor-pointer"
              >
                {approving ? 'Memproses...' : 'Ya, Setujui'}
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center space-x-2 text-rose-700">
                <UserX className="w-5 h-5" />
                <h3 className="text-sm font-bold text-gray-900">Tolak Permohonan Registrasi</h3>
              </div>
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                aria-label="Tutup modal"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Tamu: <strong>{rejectTarget.fullname}</strong> (Pass #{rejectTarget.no_pass}).
              Harap cantumkan alasan penolakan agar tamu mendapatkan penjelasan yang tepat.
            </p>

            <form onSubmit={handleConfirmReject} className="space-y-3">
              <div>
                <label htmlFor="rejection-reason-input" className="block text-xs font-bold text-gray-700 mb-1">
                  Alasan Penolakan <span className="text-rose-600">*</span>:
                </label>
                <textarea
                  id="rejection-reason-input"
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Contoh: Pejabat yang dituju sedang tugas luar kota, silakan buat janji temu kembali..."
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
                />
              </div>

              <p className="text-[11px] text-gray-500">
                Kartu pass #{rejectTarget.no_pass} akan langsung dikembalikan ke status <strong>AVAILABLE</strong>.
              </p>

              <div className="flex space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setRejectTarget(null)}
                  disabled={rejecting}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={rejecting}
                  className="flex-1 py-2.5 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-xl disabled:opacity-50 cursor-pointer"
                >
                  {rejecting ? 'Menolak...' : 'Konfirmasi Tolak'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedPhotoUrl && (
        <div
          onClick={() => setSelectedPhotoUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-4 max-w-sm w-full space-y-3 cursor-default"
          >
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h4 className="text-xs font-bold text-gray-900">Foto Pengunjung</h4>
              <button
                type="button"
                onClick={() => setSelectedPhotoUrl(null)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                aria-label="Tutup foto"
              >
                ✕
              </button>
            </div>
            <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 border border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedPhotoUrl}
                alt="Foto Pengunjung"
                className="w-full h-full object-cover"
              />
            </div>
            <button
              type="button"
              onClick={() => setSelectedPhotoUrl(null)}
              className="w-full py-2 bg-gray-100 text-gray-800 text-xs font-bold rounded-xl hover:bg-gray-200 cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
