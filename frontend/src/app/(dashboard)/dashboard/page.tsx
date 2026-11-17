'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { DashboardMetrics } from '@/types';
import {
  Users,
  UserCheck,
  UserX,
  CreditCard,
  ArrowUpRight,
  Clock,
  PlusCircle,
  LogOut,
  RefreshCw,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = async () => {
    try {
      const res = await api.get<{ success: boolean; data: DashboardMetrics }>('/dashboard/metrics');
      setMetrics(res.data.data);
    } catch (err) {
      console.error('Error fetching dashboard metrics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    // Auto-refresh every 20 seconds from live database
    const interval = setInterval(fetchMetrics, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchMetrics();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-3">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-charcoal-muted">Memuat data langsung dari database PostgreSQL...</p>
      </div>
    );
  }

  const totalPass = metrics?.total_pass || 20;
  const maxHourlyCount = Math.max(...(metrics?.hourly_stats?.map((h) => h.count) || [1]), 1);
  const maxWeeklyCount = Math.max(...(metrics?.weekly_trend?.map((w) => w.count) || [1]), 1);

  return (
    <div className="space-y-6">
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-charcoal tracking-tight">Dashboard Operasional</h2>
          <p className="text-xs text-charcoal-muted mt-0.5">
            Sinkronisasi data kunjungan dan status kartu pass langsung dari database PostgreSQL
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-ivory-200 text-charcoal text-xs font-medium rounded-lg shadow-sm hover:bg-ivory-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-brand-500' : ''}`} />
            <span>Perbarui Data</span>
          </button>
          <Link
            href="/checkin"
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-lg shadow transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Check-In Baru</span>
          </Link>
        </div>
      </div>

      {/* 4 Dark Modern KPI Cards (sesuai acuan Figma) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-darkcard text-white rounded-2xl p-5 shadow-lg relative overflow-hidden border border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">Total Kunjungan Hari Ini</span>
            <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-300">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {metrics?.total_visitors_today ?? 0}
            </span>
            <span className="text-xs text-neutral-400">tamu</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-400 flex items-center space-x-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Total sepanjang waktu: {metrics?.total_visitors_all_time ?? 0}</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-darkcard text-white rounded-2xl p-5 shadow-lg relative overflow-hidden border border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">Sedang Berkunjung (Aktif)</span>
            <div className="w-8 h-8 rounded-lg bg-amber-950/60 text-amber-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-amber-400 tracking-tight">
              {metrics?.active_visitors ?? 0}
            </span>
            <span className="text-xs text-neutral-400">orang di lokasi</span>
          </div>
          <div className="mt-2 text-[11px] text-amber-400 flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
            <span>Memegang kartu pass fisik</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-darkcard text-white rounded-2xl p-5 shadow-lg relative overflow-hidden border border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">Sudah Check-Out</span>
            <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-300">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {metrics?.completed_visitors_today ?? 0}
            </span>
            <span className="text-xs text-neutral-400">tamu selesai</span>
          </div>
          <div className="mt-2 text-[11px] text-neutral-400">
            Pass telah kembali ke rak
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-darkcard text-white rounded-2xl p-5 shadow-lg relative overflow-hidden border border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">Sisa Pass Tersedia</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-950/60 text-emerald-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-emerald-400 tracking-tight">
              {metrics?.available_pass ?? 0}
            </span>
            <span className="text-xs text-neutral-400">dari {totalPass} kartu</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-400">
            Siap dialokasikan untuk tamu
          </div>
        </div>
      </div>

      {/* Middle Section: Real-time Charts from Database */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Distribution Chart */}
        <div className="bg-white rounded-2xl p-5 border border-ivory-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-charcoal flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-brand-500" />
              <span>Aktivitas Kunjungan per Jam Hari Ini</span>
            </h3>
            <span className="text-[11px] text-charcoal-muted">Jam 08:00 - 17:00 WIB</span>
          </div>

          <div className="pt-4 h-40 flex items-end justify-between gap-1.5">
            {metrics?.hourly_stats?.map((h) => {
              const heightPct = Math.max(8, (h.count / maxHourlyCount) * 100);
              return (
                <div key={h.hour} className="flex-1 flex flex-col items-center group relative">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-[10px] px-1.5 py-0.5 rounded pointer-events-none whitespace-nowrap z-10">
                    {h.count} Tamu ({h.hour})
                  </div>
                  {/* Bar */}
                  <div
                    className={`w-full rounded-t-md transition-all duration-300 ${
                      h.count > 0 ? 'bg-brand-500 group-hover:bg-brand-600' : 'bg-ivory-100'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                  {/* Label */}
                  <span className="text-[9px] text-charcoal-muted mt-2 rotate-[-45deg] sm:rotate-0 font-mono">
                    {h.hour.slice(0, 2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Weekly Trend Chart */}
        <div className="bg-white rounded-2xl p-5 border border-ivory-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-charcoal flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-brand-500" />
              <span>Tren Kunjungan 7 Hari Terakhir</span>
            </h3>
            <span className="text-[11px] text-charcoal-muted">Data Riil Database</span>
          </div>

          <div className="pt-4 h-40 flex items-end justify-between gap-2">
            {metrics?.weekly_trend?.map((w) => {
              const heightPct = Math.max(8, (w.count / maxWeeklyCount) * 100);
              return (
                <div key={w.date} className="flex-1 flex flex-col items-center group relative">
                  {/* Tooltip */}
                  <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-[10px] px-1.5 py-0.5 rounded pointer-events-none whitespace-nowrap z-10">
                    {w.count} Tamu ({w.day}, {w.date})
                  </div>
                  {/* Bar */}
                  <div
                    className={`w-full rounded-t-lg transition-all duration-300 ${
                      w.count > 0 ? 'bg-amber-500 group-hover:bg-amber-600' : 'bg-ivory-100'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                  {/* Label */}
                  <div className="text-center mt-2">
                    <span className="block text-[10px] font-semibold text-charcoal">{w.day}</span>
                    <span className="block text-[9px] text-charcoal-muted font-mono">{w.date}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Middle Section: Pass Status & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pass Status Distribution */}
        <div className="bg-white rounded-2xl p-5 border border-ivory-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-charcoal">Status Kartu Pass Fisik</h3>
            <Link href="/pass" className="text-xs font-semibold text-brand-500 hover:text-brand-600">
              Lihat Rak →
            </Link>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="flex items-center text-charcoal">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
                  Pass Tersedia (Available)
                </span>
                <span className="font-bold text-emerald-600">
                  {metrics?.available_pass ?? 0} / {totalPass}
                </span>
              </div>
              <div className="w-full bg-ivory-100 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, ((metrics?.available_pass ?? 0) / totalPass) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="flex items-center text-charcoal">
                  <span className="w-2 h-2 rounded-full bg-amber-500 mr-2" />
                  Pass Sedang Digunakan (In Use)
                </span>
                <span className="font-bold text-amber-600">{metrics?.in_use_pass ?? 0}</span>
              </div>
              <div className="w-full bg-ivory-100 rounded-full h-2">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, ((metrics?.in_use_pass ?? 0) / totalPass) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="flex items-center text-charcoal">
                  <span className="w-2 h-2 rounded-full bg-red-500 mr-2" />
                  Pass Maintenance / Hilang
                </span>
                <span className="font-bold text-red-600">
                  {(metrics?.pass_stats?.MAINTENANCE ?? 0) + (metrics?.pass_stats?.LOST ?? 0)}
                </span>
              </div>
              <div className="w-full bg-ivory-100 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full"
                  style={{
                    width: `${Math.min(
                      100,
                      (((metrics?.pass_stats?.MAINTENANCE ?? 0) + (metrics?.pass_stats?.LOST ?? 0)) / totalPass) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-ivory-50 rounded-xl border border-ivory-200 text-[11px] text-charcoal-muted leading-relaxed">
            ℹ️ Status pass disinkronkan secara atomik dengan database PostgreSQL saat check-in dan check-out.
          </div>
        </div>

        {/* Quick Operational Shortcuts */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-ivory-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-charcoal mb-1">Aksi Cepat Resepsionis</h3>
            <p className="text-xs text-charcoal-muted mb-4">
              Pintasan tugas harian untuk mempercepat alur kedatangan dan kepulangan tamu
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href="/checkin"
                className="p-4 rounded-xl border border-ivory-200 bg-ivory-50 hover:bg-brand-50 hover:border-brand-200 transition-all flex items-start space-x-3 group"
              >
                <div className="w-10 h-10 rounded-lg bg-brand-500 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-charcoal group-hover:text-brand-500 transition-colors">
                    Registrasi Tamu (Check-In)
                  </h4>
                  <p className="text-[11px] text-charcoal-muted mt-0.5">
                    Ambil foto webcam & serahkan kartu pass
                  </p>
                </div>
              </Link>

              <Link
                href="/checkout"
                className="p-4 rounded-xl border border-ivory-200 bg-ivory-50 hover:bg-amber-50 hover:border-amber-200 transition-all flex items-start space-x-3 group"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-charcoal group-hover:text-amber-700 transition-colors">
                    Check-Out Pengunjung
                  </h4>
                  <p className="text-[11px] text-charcoal-muted mt-0.5">
                    Konfirmasi pengembalian pass fisik
                  </p>
                </div>
              </Link>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-ivory-200 flex items-center justify-between text-xs text-charcoal-muted">
            <span className="flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-brand-500" />
              <span>Jam Operasional: <strong>08:00 - 17:00 WIB</strong></span>
            </span>
            <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold">
              POSKO AKTIF
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Visitors Activity Table */}
      <div className="bg-white rounded-2xl border border-ivory-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-ivory-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-charcoal">Aktivitas Kunjungan Terkini</h3>
            <p className="text-xs text-charcoal-muted">
              Daftar tamu yang baru saja tercatat di database PostgreSQL
            </p>
          </div>
          <Link
            href="/reports"
            className="text-xs font-semibold text-brand-500 hover:text-brand-600"
          >
            Lihat Semua Riwayat →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-ivory-100/70 text-[11px] uppercase tracking-wider text-charcoal-muted font-bold border-b border-ivory-200">
                <th className="py-3 px-4">No Pass</th>
                <th className="py-3 px-4">Nama Pengunjung</th>
                <th className="py-3 px-4">Instansi</th>
                <th className="py-3 px-4">Pihak Dituju</th>
                <th className="py-3 px-4">Waktu Masuk</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-200 text-xs">
              {metrics?.recent_visitors && metrics.recent_visitors.length > 0 ? (
                metrics.recent_visitors.map((visitor) => (
                  <tr key={visitor.id_visitor} className="hover:bg-ivory-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-brand-900">
                      #{visitor.no_pass || visitor.id_pass}
                    </td>
                    <td className="py-3 px-4 font-semibold text-charcoal">
                      {visitor.fullname}
                    </td>
                    <td className="py-3 px-4 text-charcoal-muted">
                      {visitor.institution || '-'}
                    </td>
                    <td className="py-3 px-4 text-charcoal-muted">
                      {visitor.representing || '-'}
                    </td>
                    <td className="py-3 px-4 text-charcoal-muted font-mono text-[11px]">
                      {new Date(visitor.check_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                    </td>
                    <td className="py-3 px-4">
                      {visitor.is_active ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                          Aktif (Di Lokasi)
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          Selesai
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-charcoal-muted">
                    Belum ada kunjungan tercatat hari ini. Tekan tombol <strong>Check-In Baru</strong> untuk mendaftarkan tamu pertama.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
