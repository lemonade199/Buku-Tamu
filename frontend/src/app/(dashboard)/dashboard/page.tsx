'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { DashboardMetrics, PassItem } from '@/types';
import VisitorRegistrationForm from '@/components/VisitorRegistrationForm';
import PassAllocationModal from '@/components/PassAllocationModal';
import CheckinSuccessModal from '@/components/CheckinSuccessModal';
import {
  Users,
  UserCheck,
  UserX,
  CreditCard,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pass allocation modal state
  const [availablePasses, setAvailablePasses] = useState<PassItem[]>([]);
  const [loadingPasses, setLoadingPasses] = useState(false);
  const [pendingVisitor, setPendingVisitor] = useState<{
    fullname: string;
    telephone: string;
    institution?: string;
    representing?: string;
    purpose?: string;
    photoBase64: string;
  } | null>(null);
  const [showPassModal, setShowPassModal] = useState(false);
  const [submittingCheckin, setSubmittingCheckin] = useState(false);

  // Success modal state
  const [checkinSuccessData, setCheckinSuccessData] = useState<any>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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

  const fetchAvailablePasses = async () => {
    setLoadingPasses(true);
    try {
      const res = await api.get<{ success: boolean; data: PassItem[] }>('/pass/available');
      setAvailablePasses(res.data.data);
    } catch (err) {
      console.error('Error fetching available passes:', err);
    } finally {
      setLoadingPasses(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    fetchAvailablePasses();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchMetrics();
    fetchAvailablePasses();
  };

  // Step 1: Visitor completed identity form & photo -> Proceed to Pass Allocation Modal
  const handleProceedToPass = (visitorData: any) => {
    setPendingVisitor(visitorData);
    fetchAvailablePasses();
    setShowPassModal(true);
  };

  // Step 2: Confirm physical pass in separate modal -> Send to API
  const handleConfirmPassAllocation = async (selectedPassNo: string) => {
    if (!pendingVisitor) return;

    setSubmittingCheckin(true);
    try {
      const res = await api.post('/visitors/checkin', {
        fullname: pendingVisitor.fullname,
        telephone: pendingVisitor.telephone,
        institution: pendingVisitor.institution,
        representing: pendingVisitor.representing,
        purpose: pendingVisitor.purpose,
        no_pass: selectedPassNo,
        photo_base64: pendingVisitor.photoBase64,
      });

      setShowPassModal(false);
      setCheckinSuccessData(res.data.data);
      setShowSuccessModal(true);
      fetchMetrics();
      fetchAvailablePasses();
    } catch (err: any) {
      console.error('Checkin error:', err);
      alert(err.response?.data?.message || 'Gagal menyimpan check-in. Silakan coba lagi.');
    } finally {
      setSubmittingCheckin(false);
    }
  };

  const handleResetAfterSuccess = () => {
    setShowSuccessModal(false);
    setCheckinSuccessData(null);
    setPendingVisitor(null);
    fetchMetrics();
    fetchAvailablePasses();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-3">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-charcoal-muted">Memuat data beranda operasional...</p>
      </div>
    );
  }

  return (
    <div className="space-y-7 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-charcoal tracking-tight">Beranda & Layanan Resepsionis</h2>
          <p className="text-xs text-charcoal-muted mt-0.5">
            Pencatatan pengunjung terpadu, pemantauan kunjungan, dan ketersediaan kartu pass
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
        </div>
      </div>

      {/* 4 Dark Modern KPI Cards */}
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
            <span>Tercatat di sistem</span>
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
            <span>Sedang memegang pass</span>
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
            Pass telah dikembalikan
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
            <span className="text-xs text-neutral-400">kartu di rak</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-400">
            Siap untuk tamu berikutnya
          </div>
        </div>
      </div>

      {/* Main Feature: Visitor Registration Form directly on Beranda */}
      <VisitorRegistrationForm
        onProceedToPassAllocation={handleProceedToPass}
      />

      {/* Pass Allocation Modal (Separate step - tidak nyatu dalam registrasi) */}
      <PassAllocationModal
        isOpen={showPassModal}
        onClose={() => setShowPassModal(false)}
        visitorData={pendingVisitor}
        availablePasses={availablePasses}
        loadingPasses={loadingPasses}
        onConfirm={handleConfirmPassAllocation}
        submitting={submittingCheckin}
      />

      {/* Success Modal Handover */}
      <CheckinSuccessModal
        isOpen={showSuccessModal}
        result={checkinSuccessData}
        onReset={handleResetAfterSuccess}
      />

      {/* Recent Visitors Activity Table */}
      <div className="bg-white rounded-2xl border border-ivory-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-ivory-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-charcoal">Aktivitas Kunjungan Hari Ini</h3>
            <p className="text-xs text-charcoal-muted">
              Daftar tamu yang baru saja melakukan check-in atau check-out
            </p>
          </div>
          <a
            href="/pass"
            className="text-xs font-semibold text-brand-500 hover:text-brand-600"
          >
            Lihat Ketersediaan Rak Pass →
          </a>
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
                      {visitor.no_pass || `#${visitor.id_pass}`}
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
                      {new Date(visitor.check_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
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
                    Belum ada kunjungan tercatat hari ini. Isi formulir registrasi di atas untuk mendaftarkan tamu pertama.
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
