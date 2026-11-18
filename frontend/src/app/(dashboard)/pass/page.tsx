'use client';

import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import {
  CreditCard,
  PlusCircle,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  User,
  SlidersHorizontal,
  X,
} from 'lucide-react';

interface PassRackItem {
  id_pass: number;
  no_pass: string;
  slot?: string;
  status: 'AVAILABLE' | 'PENDING' | 'IN_USE' | 'MAINTENANCE' | 'LOST' | 'INACTIVE';
  current_holder?: {
    id_visitor: number;
    fullname: string;
    institution?: string;
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';
    check_in_at?: string;
  } | null;
}

export default function MonitoringPassPage() {
  const { user } = useAuth();
  const isAdmin = user?.role_code === 'ADMIN';

  const [passes, setPasses] = useState<PassRackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [showAddModal, setShowAddModal] = useState(false);
  const [newNoPass, setNewNoPass] = useState('');
  const [newSlot, setNewSlot] = useState('');
  const [addingPass, setAddingPass] = useState(false);

  const [selectedPass, setSelectedPass] = useState<PassRackItem | null>(null);
  const [newStatus, setNewStatus] = useState<string>('AVAILABLE');
  const [statusNotes, setStatusNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [approveLoadingPassId, setApproveLoadingPassId] = useState<number | null>(null);
  const [rejectTargetPass, setRejectTargetPass] = useState<PassRackItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const fetchPasses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: PassRackItem[] }>('/pass');
      setPasses(res.data.data || []);
    } catch (err) {
      console.error('Error fetching passes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPasses();
  }, [fetchPasses]);

  const handleAddPass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoPass.trim()) return;

    setAddingPass(true);
    setFeedbackMessage(null);
    try {
      await api.post('/pass', {
        no_pass: newNoPass.trim(),
        slot: newSlot.trim() || undefined,
      });
      setShowAddModal(false);
      setNewNoPass('');
      setNewSlot('');
      setFeedbackMessage({ type: 'success', text: `Kartu pass #${newNoPass} berhasil ditambahkan.` });
      fetchPasses();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal menambahkan kartu pass baru.';
      setFeedbackMessage({ type: 'error', text: msg });
    } finally {
      setAddingPass(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPass) return;

    setUpdatingStatus(true);
    setFeedbackMessage(null);
    try {
      const res = await api.put<{ success: boolean; message: string }>(`/pass/${selectedPass.id_pass}/status`, {
        status: newStatus,
        notes: statusNotes.trim() || undefined,
      });
      setSelectedPass(null);
      setStatusNotes('');
      setFeedbackMessage({
        type: 'success',
        text: res.data.message || `Status kartu pass #${selectedPass.no_pass} berhasil diubah.`,
      });
      fetchPasses();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal memperbarui status pass.';
      setFeedbackMessage({ type: 'error', text: msg });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleApprovePass = async (pass: PassRackItem) => {
    setApproveLoadingPassId(pass.id_pass);
    setFeedbackMessage(null);
    try {
      const res = await api.post<{ success: boolean; message: string }>(`/pass/${pass.id_pass}/approve`);
      setFeedbackMessage({
        type: 'success',
        text: res.data.message || `Kartu pass #${pass.no_pass} berhasil disetujui. Status langsung berubah menjadi IN_USE.`,
      });
      if (selectedPass?.id_pass === pass.id_pass) {
        setSelectedPass(null);
      }
      fetchPasses();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal menyetujui kartu pass.';
      setFeedbackMessage({ type: 'error', text: msg });
    } finally {
      setApproveLoadingPassId(null);
    }
  };

  const handleRejectPass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTargetPass) return;
    if (!rejectionReason.trim()) {
      setFeedbackMessage({ type: 'error', text: 'Alasan penolakan wajib diisi.' });
      return;
    }

    setRejecting(true);
    setFeedbackMessage(null);
    try {
      const res = await api.post<{ success: boolean; message: string }>(`/pass/${rejectTargetPass.id_pass}/reject`, {
        rejection_reason: rejectionReason.trim(),
      });
      setFeedbackMessage({
        type: 'success',
        text: res.data.message || `Permohonan pass #${rejectTargetPass.no_pass} ditolak dan status kembali menjadi AVAILABLE.`,
      });
      setRejectTargetPass(null);
      setRejectionReason('');
      if (selectedPass?.id_pass === rejectTargetPass.id_pass) {
        setSelectedPass(null);
      }
      fetchPasses();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal menolak permohonan kartu pass.';
      setFeedbackMessage({ type: 'error', text: msg });
    } finally {
      setRejecting(false);
    }
  };

  const openStatusModal = (pass: PassRackItem) => {
    setSelectedPass(pass);
    setNewStatus(pass.status);
    setStatusNotes('');
  };

  const filteredPasses = passes.filter((p) => {
    const matchesSearch =
      p.no_pass.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.slot && p.slot.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.current_holder && p.current_holder.fullname.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const countAvailable = passes.filter((p) => p.status === 'AVAILABLE').length;
  const countInUse = passes.filter((p) => p.status === 'IN_USE').length;
  const countMaintenance = passes.filter((p) => p.status === 'MAINTENANCE' || p.status === 'LOST').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            Tersedia di Rak
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            Menunggu Persetujuan
          </span>
        );
      case 'IN_USE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#8A001A]/10 text-[#8A001A] border border-[#8A001A]/30">
            Sedang Dipakai
          </span>
        );
      case 'MAINTENANCE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            Perlu Perbaikan
          </span>
        );
      case 'LOST':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
            Hilang
          </span>
        );
      case 'INACTIVE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300">
            Nonaktif
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Monitoring Kartu Pass</h1>
          <p className="text-xs text-gray-600 mt-0.5">
            Pantau ketersediaan fisik, posisi slot, dan ubah status kondisi kartu tamu
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => fetchPasses()}
            className="p-2 bg-white text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 shadow-2xs transition-colors flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A001A]"
            title="Muat Ulang"
            aria-label="Muat ulang data pass"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#8A001A]' : ''}`} />
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-[#8A001A] hover:bg-[#700015] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#8A001A]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Tambah Pass</span>
            </button>
          )}
        </div>
      </div>

      {feedbackMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-gray-400 hover:text-gray-600 cursor-pointer p-1"
            aria-label="Tutup notifikasi"
          >
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-black text-white p-5 rounded-2xl shadow-sm flex items-center justify-between border-l-4 border-emerald-500">
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Tersedia</p>
            <p className="text-3xl font-black mt-1 tracking-tight text-white">{countAvailable}</p>
            <p className="text-[11px] text-gray-400 mt-1">Siap diserahkan ke tamu</p>
          </div>
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-emerald-400" />
          </div>
        </div>

        <div className="bg-black text-white p-5 rounded-2xl shadow-sm flex items-center justify-between border-l-4 border-[#8A001A]">
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Dipakai</p>
            <p className="text-3xl font-black mt-1 tracking-tight text-white">{countInUse}</p>
            <p className="text-[11px] text-gray-400 mt-1">Sedang dibawa pengunjung</p>
          </div>
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
            <User className="w-6 h-6 text-[#FF6B8B]" />
          </div>
        </div>

        <div className="bg-black text-white p-5 rounded-2xl shadow-sm flex items-center justify-between border-l-4 border-amber-500">
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Perlu Perbaikan / Hilang</p>
            <p className="text-3xl font-black mt-1 tracking-tight text-white">{countMaintenance}</p>
            <p className="text-[11px] text-gray-400 mt-1">Kartu tidak dapat dipinjamkan</p>
          </div>
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="w-4 h-4 text-[#8A001A]" />
            <h2 className="text-sm font-bold text-gray-900">Visual Rak Gantungan Kartu</h2>
          </div>
          <div className="flex items-center space-x-3 text-[11px] text-gray-600 font-medium">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Tersedia</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#8A001A]"></span>
              <span>Dipakai</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>Rusak/Hilang</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-gray-500">Memuat status rak kartu pass...</div>
        ) : passes.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-500">Belum ada kartu pass yang terdaftar.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-3">
            {passes.map((pass) => {
              let bgStyle = 'bg-emerald-50 border-emerald-200 hover:border-emerald-400 text-emerald-900';
              let badgeColor = 'bg-emerald-600 text-white';

              if (pass.status === 'PENDING') {
                bgStyle = 'bg-amber-50 border-amber-300 hover:border-amber-400 text-amber-950';
                badgeColor = 'bg-amber-500 text-black font-extrabold';
              } else if (pass.status === 'IN_USE') {
                bgStyle = 'bg-rose-50/70 border-rose-200 hover:border-rose-400 text-rose-950';
                badgeColor = 'bg-[#8A001A] text-white';
              } else if (pass.status === 'MAINTENANCE' || pass.status === 'LOST') {
                bgStyle = 'bg-amber-50 border-amber-200 hover:border-amber-400 text-amber-950';
                badgeColor = 'bg-amber-600 text-white';
              } else if (pass.status === 'INACTIVE') {
                bgStyle = 'bg-gray-50 border-gray-200 hover:border-gray-400 text-gray-700 opacity-60';
                badgeColor = 'bg-gray-500 text-white';
              }

              return (
                <button
                  type="button"
                  key={pass.id_pass}
                  onClick={() => openStatusModal(pass)}
                  className={`border rounded-xl p-2.5 flex flex-col items-center justify-between text-center transition-all cursor-pointer hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A001A] ${bgStyle}`}
                  title={`Ubah kondisi Pass #${pass.no_pass}`}
                  aria-label={`Kartu pass nomor ${pass.no_pass}, status ${pass.status}`}
                >
                  <span className={`text-[11px] font-black px-2 py-0.5 rounded-full shadow-2xs ${badgeColor}`}>
                    #{pass.no_pass}
                  </span>
                  <span className="text-[10px] font-semibold mt-1 truncate max-w-full">
                    {pass.slot || `Slot ${pass.no_pass}`}
                  </span>
                  <span className="text-[9px] text-gray-600 mt-0.5 truncate max-w-full">
                    {pass.status === 'IN_USE' ? pass.current_holder?.fullname || 'Dipakai' : pass.status}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nomor kartu pass / slot..."
            aria-label="Cari nomor kartu pass atau slot rak"
            className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#8A001A]/20 focus:border-[#8A001A]"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              aria-label="Hapus pencarian"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <label htmlFor="pass-status-filter" className="flex items-center space-x-1.5 text-xs text-gray-600 cursor-pointer">
            <Filter className="w-3.5 h-3.5 text-gray-500" />
            <span className="font-semibold">Filter:</span>
          </label>
          <select
            id="pass-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#8A001A]/20 focus:border-[#8A001A] cursor-pointer"
          >
            <option value="ALL">Semua Status</option>
            <option value="AVAILABLE">Tersedia di Rak (AVAILABLE)</option>
            <option value="PENDING">Menunggu Persetujuan (PENDING)</option>
            <option value="IN_USE">Sedang Dipakai (IN_USE)</option>
            <option value="MAINTENANCE">Perlu Perbaikan</option>
            <option value="LOST">Hilang</option>
            <option value="INACTIVE">Nonaktif</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">Daftar Kartu Pass</h2>
          <span className="text-xs text-gray-600 font-medium">
            Total {filteredPasses.length} kartu
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase tracking-wider text-[11px]">
                <th scope="col" className="py-3 px-4 w-28 text-center">Nomor Kartu</th>
                <th scope="col" className="py-3 px-4">Posisi Slot Rak</th>
                <th scope="col" className="py-3 px-4 text-center">Status Kondisi</th>
                <th scope="col" className="py-3 px-4">Keterangan / Pemegang</th>
                <th scope="col" className="py-3 px-4 text-center w-36">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500 font-medium">
                    Memuat data kartu pass...
                  </td>
                </tr>
              ) : filteredPasses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500 font-medium">
                    Tidak ada kartu pass yang cocok dengan pencarian atau filter.
                  </td>
                </tr>
              ) : (
                filteredPasses.map((pass) => {
                  const passNo = String(pass.no_pass).padStart(2, '0');

                  return (
                    <tr key={pass.id_pass} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-block bg-[#6B0014] text-white font-extrabold text-xs px-3.5 py-1 rounded-full shadow-2xs min-w-[38px]">
                          {passNo}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-gray-800 whitespace-nowrap">
                        {pass.slot || `Slot ${passNo}`}
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {getStatusBadge(pass.status)}
                      </td>

                      <td className="py-3.5 px-4 text-gray-700 font-medium">
                        {pass.status === 'PENDING' ? (
                          <div className="flex flex-col text-left">
                            <div className="flex items-center space-x-1.5 text-amber-900 font-bold">
                              <User className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                              <span>{pass.current_holder?.fullname || 'Pengunjung Pending'}</span>
                            </div>
                            {pass.current_holder?.institution && (
                              <span className="text-[11px] text-gray-600 font-normal">
                                {pass.current_holder.institution}
                              </span>
                            )}
                            <span className="text-[10px] text-amber-700 font-semibold mt-0.5">
                              Menunggu konfirmasi persetujuan
                            </span>
                          </div>
                        ) : pass.status === 'IN_USE' && pass.current_holder ? (
                          <div className="flex items-center space-x-1.5 text-gray-900 font-semibold">
                            <User className="w-3.5 h-3.5 text-[#8A001A] shrink-0" />
                            <span>{pass.current_holder.fullname}</span>
                            {pass.current_holder.institution && (
                              <span className="text-gray-600 font-normal">
                                ({pass.current_holder.institution})
                              </span>
                            )}
                          </div>
                        ) : pass.status === 'AVAILABLE' ? (
                          <span className="text-emerald-700 font-medium">Tersedia di rak resepsionis</span>
                        ) : (
                          <span className="text-gray-500 italic">Tidak tersedia untuk tamu</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {pass.status === 'PENDING' ? (
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              type="button"
                              disabled={approveLoadingPassId === pass.id_pass}
                              onClick={() => handleApprovePass(pass)}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-2xs transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                              title={`Setujui permohonan pass #${pass.no_pass} (status langsung berubah menjadi IN_USE)`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{approveLoadingPassId === pass.id_pass ? 'Diproses...' : 'Approved'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectTargetPass(pass);
                                setRejectionReason('');
                              }}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
                              title={`Tolak permohonan pass #${pass.no_pass} (status kembali ke AVAILABLE)`}
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Rejected</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openStatusModal(pass)}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl shadow-2xs transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A001A]"
                            title={`Ubah kondisi status kartu #${pass.no_pass}`}
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5 text-[#8A001A]" />
                            <span>Ubah Kondisi</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">
                Ubah Kondisi Pass #{String(selectedPass.no_pass).padStart(2, '0')}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedPass(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer p-1"
                aria-label="Tutup dialog"
              >
                ✕
              </button>
            </div>

            {selectedPass.status === 'PENDING' && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-900">Keputusan Registrasi Tamu:</span>
                  <span className="font-extrabold px-2 py-0.5 rounded-full text-[10px] bg-amber-200 text-amber-950">
                    PENDING
                  </span>
                </div>
                <div className="text-xs text-gray-800">
                  <p className="font-semibold">{selectedPass.current_holder?.fullname || 'Tamu Menunggu Konfirmasi'}</p>
                  {selectedPass.current_holder?.institution && (
                    <p className="text-[11px] text-gray-600">{selectedPass.current_holder.institution}</p>
                  )}
                </div>
                <div className="pt-1 flex space-x-2">
                  <button
                    type="button"
                    disabled={approveLoadingPassId === selectedPass.id_pass}
                    onClick={() => handleApprovePass(selectedPass)}
                    className="flex-1 py-2 px-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-2xs transition-colors cursor-pointer flex items-center justify-center space-x-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{approveLoadingPassId === selectedPass.id_pass ? 'Memproses...' : 'Approved (IN_USE)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRejectTargetPass(selectedPass);
                      setRejectionReason('');
                    }}
                    className="flex-1 py-2 px-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-colors cursor-pointer flex items-center justify-center space-x-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Rejected (AVAILABLE)</span>
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleUpdateStatus} className="space-y-3 text-xs">
              <div>
                <label htmlFor="pass-condition-select" className="block font-semibold text-gray-700 mb-1.5">
                  Status Kartu Pass:
                </label>
                <select
                  id="pass-condition-select"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-[#FAF7F0] border border-[#E8DFD8] rounded-xl p-2.5 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30 focus:border-[#8A001A] cursor-pointer"
                >
                  <option value="AVAILABLE">AVAILABLE (Tersedia di Rak)</option>
                  <option value="PENDING">PENDING (Menunggu Persetujuan)</option>
                  <option value="IN_USE">IN_USE (Sedang Dibawa Tamu)</option>
                  <option value="MAINTENANCE">MAINTENANCE (Perlu Perbaikan / Patah)</option>
                  <option value="LOST">LOST (Hilang)</option>
                  <option value="INACTIVE">INACTIVE (Nonaktif Sementara)</option>
                </select>
              </div>

              {selectedPass.status === 'PENDING' && newStatus === 'AVAILABLE' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] leading-relaxed">
                  <div className="font-bold flex items-center space-x-1 mb-0.5">
                    <span>Perhatian Otomatis Pembatalan:</span>
                  </div>
                  <span>
                    Kartu ini saat ini sedang diajukan oleh tamu{' '}
                    <strong>{selectedPass.current_holder?.fullname || 'pending'}</strong>. Mengubah status menjadi{' '}
                    <strong>AVAILABLE</strong> akan otomatis membatalkan/menolak permohonan registrasi tamu tersebut.
                  </span>
                </div>
              )}

              {selectedPass.status === 'IN_USE' && newStatus === 'AVAILABLE' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] leading-relaxed">
                  <div className="font-bold flex items-center space-x-1 mb-0.5">
                    <span>Perhatian Otomatis Check-Out:</span>
                  </div>
                  <span>
                    Kartu ini saat ini sedang dibawa oleh tamu{' '}
                    <strong>{selectedPass.current_holder?.fullname || 'aktif'}</strong>. Mengubah status menjadi{' '}
                    <strong>AVAILABLE</strong> akan otomatis memproses <strong>Check-Out</strong> bagi tamu tersebut.
                  </span>
                </div>
              )}

              <div>
                <label htmlFor="pass-notes-area" className="block font-semibold text-gray-700 mb-1">
                  Catatan Tambahan:
                </label>
                <textarea
                  id="pass-notes-area"
                  rows={2}
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="Keterangan kondisi fisik kartu..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30 focus:border-[#8A001A]"
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedPass(null)}
                  className="flex-1 py-2 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updatingStatus}
                  className="flex-1 py-2 bg-[#8A001A] hover:bg-[#700015] text-white font-semibold rounded-xl disabled:opacity-50 cursor-pointer"
                >
                  {updatingStatus ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {rejectTargetPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">
                Tolak Permohonan Pass #{String(rejectTargetPass.no_pass).padStart(2, '0')}
              </h3>
              <button
                type="button"
                onClick={() => setRejectTargetPass(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer p-1"
                aria-label="Tutup dialog"
              >
                ✕
              </button>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-900 space-y-1">
              <p className="font-bold">
                Tamu: {rejectTargetPass.current_holder?.fullname || 'Pengunjung'}
              </p>
              {rejectTargetPass.current_holder?.institution && (
                <p className="text-[11px] text-gray-600">
                  Instansi: {rejectTargetPass.current_holder.institution}
                </p>
              )}
              <p className="text-[11px] text-rose-800">
                Status kartu pass akan otomatis kembali menjadi <strong>AVAILABLE</strong> di rak setelah ditolak.
              </p>
            </div>

            <form onSubmit={handleRejectPass} className="space-y-3 text-xs">
              <div>
                <label htmlFor="pass-reject-reason" className="block font-semibold text-gray-700 mb-1">
                  Alasan Penolakan <span className="text-rose-600">*</span>
                </label>
                <textarea
                  id="pass-reject-reason"
                  rows={3}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Masukkan alasan penolakan kunjungan..."
                  className="w-full bg-[#FAF7F0] border border-[#E8DFD8] rounded-xl p-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setRejectTargetPass(null)}
                  className="flex-1 py-2 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={rejecting || !rejectionReason.trim()}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold rounded-xl cursor-pointer"
                >
                  {rejecting ? 'Menolak...' : 'Tolak & AVAILABLE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Tambah Kartu Pass Baru</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer p-1"
                aria-label="Tutup dialog"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddPass} className="space-y-3 text-xs">
              <div>
                <label htmlFor="new-pass-number" className="block font-semibold text-gray-700 mb-1">
                  Nomor Kartu Pass <span className="text-[#8A001A]">*</span>:
                </label>
                <input
                  id="new-pass-number"
                  type="text"
                  required
                  value={newNoPass}
                  onChange={(e) => setNewNoPass(e.target.value)}
                  placeholder="Contoh: 21, A-05"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30 focus:border-[#8A001A]"
                />
              </div>

              <div>
                <label htmlFor="new-pass-slot" className="block font-semibold text-gray-700 mb-1">Posisi Slot Rak Fisik:</label>
                <input
                  id="new-pass-slot"
                  type="text"
                  value={newSlot}
                  onChange={(e) => setNewSlot(e.target.value)}
                  placeholder="Contoh: Rak B - Slot 01"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30 focus:border-[#8A001A]"
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={addingPass}
                  className="flex-1 py-2 bg-[#8A001A] hover:bg-[#700015] text-white font-semibold rounded-xl disabled:opacity-50 cursor-pointer"
                >
                  {addingPass ? 'Menambahkan...' : 'Tambah Pass'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
