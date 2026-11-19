'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api, { getVisitorPhotoUrl } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { DashboardMetrics, VisitorItem, RecentActivity } from '@/types';
import {
  User,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  Building,
  Clock,
  RefreshCw,
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
} from 'recharts';
import CheckoutConfirmModal, { ActiveVisitor } from '@/components/CheckoutConfirmModal';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export default function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role_code === 'ADMIN';

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [pendingVisitors, setPendingVisitors] = useState<VisitorItem[]>([]);
  const [activeVisitors, setActiveVisitors] = useState<VisitorItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [detailVisitor, setDetailVisitor] = useState<VisitorItem | null>(null);
  const [approving, setApproving] = useState(false);

  const [rejectTarget, setRejectTarget] = useState<VisitorItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const [checkoutVisitor, setCheckoutVisitor] = useState<ActiveVisitor | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [processingCheckout, setProcessingCheckout] = useState(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [metricRes, pendingRes, activeRes] = await Promise.all([
        api.get<{ success: boolean; data: DashboardMetrics }>('/dashboard/metrics'),
        api.get<{ success: boolean; data: VisitorItem[] }>('/visitors/pending').catch(() => ({ data: { data: [] } })),
        api.get<{ success: boolean; data: VisitorItem[] }>('/visitors/active').catch(() => ({ data: { data: [] } })),
      ]);

      setMetrics(metricRes.data.data);
      setPendingVisitors(pendingRes.data.data || metricRes.data.data?.pending_visitors || []);
      setActiveVisitors(activeRes.data.data || []);
    } catch (err) {
      console.error('Gagal mengambil data dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleConfirmApprove = async (visitor: VisitorItem) => {
    setApproving(true);
    setFeedback(null);
    try {
      const res = await api.post(`/visitors/${visitor.id_visitor}/approve`);
      setFeedback({
        type: 'success',
        text: res.data.message || `Kartu pass diserahkan kepada ${visitor.fullname}. Status sekarang IN_USE.`,
      });
      setDetailVisitor(null);
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal menyerahkan kartu pass.';
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
        text: res.data.message || `Registrasi ${rejectTarget.fullname} ditolak. Kartu kembali AVAILABLE.`,
      });
      setRejectTarget(null);
      setRejectReason('');
      setDetailVisitor(null);
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal menolak registrasi.';
      setFeedback({ type: 'error', text: msg });
    } finally {
      setRejecting(false);
    }
  };

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
      setFeedback({
        type: 'success',
        text: res.data.message || 'Pengembalian kartu pass berhasil diverifikasi.',
      });
      setShowCheckoutModal(false);
      setCheckoutVisitor(null);
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal memproses pengembalian akses.';
      setFeedback({ type: 'error', text: msg });
    } finally {
      setProcessingCheckout(false);
    }
  };

  if (loading && !metrics) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-3">
        <div className="w-8 h-8 border-4 border-[#8A001A] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-gray-500 font-medium">Memuat data dashboard...</p>
      </div>
    );
  }

  const totalPass = metrics?.total_pass || 16;
  const inUsePass = metrics?.in_use_pass ?? 0;
  const availablePass = metrics?.available_pass ?? 0;
  const pendingPass = metrics?.pending_pass ?? pendingVisitors.length;
  const inactivePass = metrics?.inactive_pass ?? metrics?.pass_stats?.INACTIVE ?? 0;
  const activePassCount = metrics?.active_pass_count ?? Math.max(0, totalPass - inactivePass);

  const monthlyChartData = metrics?.monthly_stats && metrics.monthly_stats.length > 0
    ? metrics.monthly_stats
    : [
        { month: 'Jan', count: 18 },
        { month: 'Feb', count: 24 },
        { month: 'Mart', count: 21 },
        { month: 'Apr', count: 30 },
        { month: 'Mei', count: 4 },
        { month: 'Jun', count: 10 },
        { month: 'Jul', count: 17 },
        { month: 'Agu', count: 20 },
        { month: 'Sep', count: 24 },
        { month: 'Okt', count: 27 },
        { month: 'Nov', count: 19 },
        { month: 'Des', count: 6 },
      ];

  const adminPassPieData = [
    { name: 'Tersedia', value: availablePass, color: '#FFFFFF' },
    { name: 'Menunggu', value: pendingPass, color: '#EAB308' },
    { name: 'Dipakai', value: inUsePass, color: '#4A000E' },
    ...(inactivePass > 0 ? [{ name: 'Nonaktif', value: inactivePass, color: '#9CA3AF' }] : []),
  ];

  const recentActivities: RecentActivity[] = metrics?.recent_activities && metrics.recent_activities.length > 0
    ? metrics.recent_activities
    : [
        {
          id: 1,
          date: 'Rabu, 11/11/2026',
          time: '14.20',
          description: 'Siti Rahma (SMKN 2 Depok) check in dan menunggu kartu pass 08',
        },
        {
          id: 2,
          date: 'Rabu, 11/11/2026',
          time: '10.45',
          description: 'Rina menyerahkan kartu pass 09 kepada Diman Ferdiana (PT Telkom)',
        },
        {
          id: 3,
          date: 'Rabu, 11/11/2026',
          time: '08.56',
          description: 'Rina menyerahkan kartu pass 10 kepada Annisa A. Faza (Kemendikbud)',
        },
        {
          id: 4,
          date: 'Rabu, 11/11/2026',
          time: '07.55',
          description: 'Rina login ke sistem',
        },
      ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold italic text-[#3B0A11] tracking-tight">
          Dashboard
        </h1>
        <button
          type="button"
          onClick={fetchData}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-full text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-2xs transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#8A001A]" />
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

      {isAdmin ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-black text-white rounded-2xl py-5 px-4 flex flex-col items-center justify-center text-center shadow-md border-2 border-black">
              <span className="text-sm sm:text-base font-semibold italic text-gray-200">
                Pass aktif
              </span>
              <span className="text-4xl sm:text-5xl font-black text-white mt-1.5">
                {inUsePass} / {activePassCount}
              </span>
            </div>

            <div className="bg-black text-white rounded-2xl py-5 px-4 flex flex-col items-center justify-center text-center shadow-md border-2 border-black">
              <span className="text-sm sm:text-base font-semibold italic text-gray-200">
                Tamu hari ini
              </span>
              <span className="text-4xl sm:text-5xl font-black text-white mt-1.5">
                {metrics?.total_visitors_today ?? 0}
              </span>
            </div>

            <div className="bg-black text-white rounded-2xl py-5 px-4 flex flex-col items-center justify-center text-center shadow-md border-2 border-black">
              <span className="text-sm sm:text-base font-semibold italic text-gray-200">
                Tamu dalam gedung
              </span>
              <span className="text-4xl sm:text-5xl font-black text-white mt-1.5">
                {metrics?.active_visitors ?? 0}
              </span>
            </div>

            <div className="bg-black text-white rounded-2xl py-5 px-4 flex flex-col items-center justify-center text-center shadow-md border-2 border-black">
              <span className="text-sm sm:text-base font-semibold italic text-gray-200">
                Tamu bulan ini
              </span>
              <span className="text-4xl sm:text-5xl font-black text-white mt-1.5">
                {metrics?.visitors_this_month ?? 0}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            <div className="lg:col-span-8 bg-white rounded-2xl border-2 border-[#4A000E] p-5 shadow-sm flex flex-col justify-between">
              <div className="border-b border-gray-200 pb-2 mb-2">
                <h3 className="text-sm font-bold italic underline decoration-gray-400 text-[#3B0A11]">
                  Grafik tamu per bulan
                </h3>
              </div>

              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChartData} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10, fill: '#6B7280' }}
                      tickLine={false}
                      axisLine={{ stroke: '#E5E7EB' }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 10, fill: '#6B7280' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        color: '#FFFFFF',
                        borderRadius: '8px',
                        fontSize: '11px',
                        border: 'none',
                      }}
                      formatter={(val: any) => [`${val} Tamu`, 'Jumlah']}
                    />
                    <Bar
                      dataKey="count"
                      fill="#8A001A"
                      radius={[4, 4, 0, 0]}
                      label={{ position: 'top', fill: '#1F2937', fontSize: 10, fontWeight: 700 }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col">
              <div className="mb-2">
                <h3 className="text-sm font-bold italic underline decoration-gray-400 text-[#3B0A11]">
                  Status pass
                </h3>
              </div>

              <div className="bg-[#8A001A] text-white rounded-2xl p-5 shadow-sm flex-1 flex flex-col justify-between">
                <div className="h-44 w-full relative flex items-center justify-center my-auto">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={adminPassPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={68}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {adminPassPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          color: '#FFFFFF',
                          borderRadius: '8px',
                          fontSize: '11px',
                          border: 'none',
                        }}
                        formatter={(val: any, name: any) => [`${val} Kartu`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-black text-white leading-none">{totalPass}</span>
                    <span className="text-[10px] text-white/80 font-medium">kartu</span>
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t border-white/20 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-xs bg-white shrink-0"></span>
                      <span className="text-white text-[11px] font-medium">Tersedia</span>
                    </div>
                    <span className="font-bold text-white text-xs">{availablePass}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-xs bg-[#EAB308] shrink-0"></span>
                      <span className="text-white text-[11px] font-medium">Menunggu</span>
                    </div>
                    <span className="font-bold text-white text-xs">{pendingPass}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-xs bg-[#4A000E] shrink-0"></span>
                      <span className="text-white text-[11px] font-medium">Dipakai</span>
                    </div>
                    <span className="font-bold text-white text-xs">{inUsePass}</span>
                  </div>
                  {inactivePass > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-xs bg-[#9CA3AF] shrink-0"></span>
                        <span className="text-white text-[11px] font-medium">Nonaktif</span>
                      </div>
                      <span className="font-bold text-white text-xs">{inactivePass}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold italic underline decoration-gray-400 text-[#3B0A11]">
                  Aktivitas terbaru
                </h2>
                <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full bg-[#8A001A] text-white text-xs font-bold not-italic">
                  {recentActivities.length}
                </span>
              </div>
              <Link href="/reports" className="text-xs font-bold text-[#8A001A] hover:underline">
                Lihat semua ›
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="pb-3 text-xs italic font-bold text-[#3B0A11] underline uppercase tracking-wider w-44">
                      Hari/tanggal
                    </th>
                    <th className="pb-3 text-xs italic font-bold text-[#3B0A11] underline uppercase tracking-wider w-24">
                      Jam
                    </th>
                    <th className="pb-3 text-xs italic font-bold text-[#3B0A11] underline uppercase tracking-wider">
                      Isi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-xs">
                  {recentActivities.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-gray-500">
                        Belum ada aktivitas tercatat.
                      </td>
                    </tr>
                  ) : (
                    recentActivities.map((act) => (
                      <tr key={act.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3 text-gray-800 font-medium whitespace-nowrap">
                          {act.date}
                        </td>
                        <td className="py-3 text-gray-700 whitespace-nowrap">
                          {act.time}
                        </td>
                        <td className="py-3 text-gray-900 font-medium">
                          {act.description}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-black text-white rounded-2xl py-5 px-4 flex flex-col items-center justify-center text-center shadow-md border-2 border-black">
              <span className="text-sm sm:text-base font-semibold italic text-gray-200">
                Pass tersedia
              </span>
              <span className="text-4xl sm:text-5xl font-black text-white mt-1.5">
                {availablePass}
              </span>
            </div>

            <div className="bg-black text-white rounded-2xl py-5 px-4 flex flex-col items-center justify-center text-center shadow-md border-2 border-black">
              <span className="text-sm sm:text-base font-semibold italic text-gray-200">
                Jumlah antrian
              </span>
              <span className="text-4xl sm:text-5xl font-black text-white mt-1.5">
                {pendingVisitors.length}
              </span>
            </div>

            <div className="bg-black text-white rounded-2xl py-5 px-4 flex flex-col items-center justify-center text-center shadow-md border-2 border-black">
              <span className="text-sm sm:text-base font-semibold italic text-gray-200">
                Tamu dalam gedung
              </span>
              <span className="text-4xl sm:text-5xl font-black text-white mt-1.5">
                {activeVisitors.length}
              </span>
            </div>

            <div className="bg-black text-white rounded-2xl py-5 px-4 flex flex-col items-center justify-center text-center shadow-md border-2 border-black">
              <span className="text-sm sm:text-base font-semibold italic text-gray-200">
                Tamu hari ini
              </span>
              <span className="text-4xl sm:text-5xl font-black text-white mt-1.5">
                {metrics?.total_visitors_today ?? 0}
              </span>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold italic underline decoration-gray-400 text-[#3B0A11]">
                Menunggu
              </h2>
              <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full bg-[#8A001A] text-white text-xs font-bold not-italic">
                {pendingVisitors.length}
              </span>
            </div>

            {pendingVisitors.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-gray-200 text-xs text-gray-500 font-medium">
                Tidak ada antrian tamu yang menunggu persetujuan kartu pass.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {pendingVisitors.map((v) => {
                  const passNum = v.no_pass || String(v.id_pass);
                  const formattedPass = passNum.padStart(2, '0');
                  const timeStr = v.check_in_at
                    ? `${String(new Date(v.check_in_at).getHours()).padStart(2, '0')}:${String(new Date(v.check_in_at).getMinutes()).padStart(2, '0')}`
                    : '-';

                  return (
                    <div
                      key={v.id_visitor}
                      className="bg-white border border-gray-300 rounded-lg p-3 shadow-2xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="w-full h-32 bg-[#D1D5DB] rounded flex items-center justify-center overflow-hidden mb-2.5">
                          {v.capture_id ? (
                            <img
                              src={getVisitorPhotoUrl(v.id_visitor)}
                              alt={v.fullname}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-gray-400 flex items-center justify-center">
                              <User className="w-10 h-10 text-white" />
                            </div>
                          )}
                        </div>

                        <h3 className="font-bold text-sm text-gray-900 truncate" title={v.fullname}>
                          {v.fullname}
                        </h3>
                        <p className="text-[11px] text-gray-500 truncate" title={v.institution || '-'}>
                          {v.institution || '-'}
                        </p>

                        <div className="flex items-center justify-between mt-2 mb-3">
                          <span className="px-2.5 py-0.5 bg-[#4A000E] text-white text-[10px] font-bold rounded-full">
                            No. pass {formattedPass}
                          </span>
                          <span className="text-[11px] text-gray-500 font-medium">
                            {timeStr}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => handleConfirmApprove(v)}
                          disabled={approving}
                          className="w-full py-1.5 bg-[#8A001A] hover:bg-[#700015] disabled:opacity-50 text-white text-xs font-bold rounded transition-colors cursor-pointer text-center"
                        >
                          Serahkan kartu pass
                        </button>
                        <button
                          type="button"
                          onClick={() => setDetailVisitor(v)}
                          className="w-full py-1.5 bg-[#6B7280] hover:bg-[#555C68] text-white text-xs font-bold rounded transition-colors cursor-pointer text-center"
                        >
                          Detail
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <hr className="border-t border-gray-200/80 my-2" />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold italic underline decoration-gray-400 text-[#3B0A11]">
                Tamu penerima kartu pass
              </h2>
              <Link href="/reports" className="text-xs font-bold text-[#8A001A] hover:underline">
                Lihat semua ›
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="pb-3 text-xs italic font-bold text-[#3B0A11] uppercase tracking-wider">
                      Foto
                    </th>
                    <th className="pb-3 text-xs italic font-bold text-[#3B0A11] uppercase tracking-wider">
                      Nama
                    </th>
                    <th className="pb-3 text-xs italic font-bold text-[#3B0A11] uppercase tracking-wider">
                      Instansi
                    </th>
                    <th className="pb-3 text-xs italic font-bold text-[#3B0A11] uppercase tracking-wider">
                      Keperluan
                    </th>
                    <th className="pb-3 text-xs italic font-bold text-[#3B0A11] uppercase tracking-wider text-center">
                      No. pass
                    </th>
                    <th className="pb-3 text-xs italic font-bold text-[#3B0A11] uppercase tracking-wider text-center">
                      Jam masuk
                    </th>
                    <th className="pb-3 text-xs italic font-bold text-[#3B0A11] uppercase tracking-wider text-center">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {activeVisitors.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-xs text-gray-500 font-medium">
                        Tidak ada tamu yang sedang memegang kartu pass di dalam gedung.
                      </td>
                    </tr>
                  ) : (
                    activeVisitors.map((v) => {
                      const passNum = v.no_pass || String(v.id_pass);
                      const formattedPass = passNum.padStart(2, '0');
                      const timeStr = v.check_in_at
                        ? `${String(new Date(v.check_in_at).getHours()).padStart(2, '0')}.${String(new Date(v.check_in_at).getMinutes()).padStart(2, '0')}`
                        : '-';

                      return (
                        <tr key={v.id_visitor} className="hover:bg-gray-50/70 transition-colors">
                          <td className="py-2.5">
                            <div className="w-9 h-9 rounded-full bg-gray-400 overflow-hidden flex items-center justify-center shrink-0">
                              {v.capture_id ? (
                                <img
                                  src={getVisitorPhotoUrl(v.id_visitor)}
                                  alt={v.fullname}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <User className="w-5 h-5 text-white" />
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 text-xs font-bold text-gray-900 pr-3">
                            {v.fullname}
                          </td>
                          <td className="py-2.5 text-xs text-gray-700 pr-3">
                            {v.institution || '-'}
                          </td>
                          <td className="py-2.5 text-xs text-gray-700 pr-3 max-w-xs truncate" title={v.purpose || '-'}>
                            {v.purpose || '-'}
                          </td>
                          <td className="py-2.5 text-xs font-semibold text-gray-900 text-center">
                            {formattedPass}
                          </td>
                          <td className="py-2.5 text-xs text-gray-700 text-center">
                            {timeStr}
                          </td>
                          <td className="py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleInitiateCheckout(v)}
                              className="px-4 py-1 bg-[#8A001A] hover:bg-[#700015] text-white text-xs font-bold rounded-full shadow-xs transition-colors cursor-pointer"
                            >
                              Pengembalian
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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
                      src={getVisitorPhotoUrl(detailVisitor.id_visitor)}
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
                  disabled={approving}
                  className="flex-1 py-2.5 bg-[#8A001A] hover:bg-[#700015] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {approving ? 'Memproses...' : 'Serahkan Kartu Pass'}
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

      <CheckoutConfirmModal
        isOpen={showCheckoutModal}
        visitor={checkoutVisitor}
        onClose={() => setShowCheckoutModal(false)}
        onConfirm={handleConfirmCheckout}
        loading={processingCheckout}
      />
    </div>
  );
}
