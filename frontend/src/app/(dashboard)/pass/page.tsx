'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import {
  CreditCard,
  PlusCircle,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  ShieldAlert,
  SlidersHorizontal,
  LogOut,
} from 'lucide-react';
import CheckoutConfirmModal, { ActiveVisitor } from '@/components/CheckoutConfirmModal';

interface PassRackItem {
  id_pass: number;
  no_pass: string;
  slot?: string;
  status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'LOST' | 'INACTIVE';
  current_holder?: {
    id_visitor: number;
    fullname: string;
    institution?: string;
    check_in_at?: string;
  } | null;
}

export default function PassManagementPage() {
  const { user } = useAuth();
  const isAdmin = user?.role_code === 'ADMIN';

  const [passes, setPasses] = useState<PassRackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal State for adding pass
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNoPass, setNewNoPass] = useState('');
  const [newSlot, setNewSlot] = useState('');
  const [addingPass, setAddingPass] = useState(false);

  // Modal State for updating pass status
  const [selectedPass, setSelectedPass] = useState<PassRackItem | null>(null);
  const [newStatus, setNewStatus] = useState<string>('AVAILABLE');
  const [statusNotes, setStatusNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Modal State for checking out visitor from pass rack
  const [checkoutVisitor, setCheckoutVisitor] = useState<ActiveVisitor | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [processingCheckout, setProcessingCheckout] = useState(false);

  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchPasses = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: PassRackItem[] }>('/pass');
      setPasses(res.data.data);
    } catch (err) {
      console.error('Error fetching passes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPasses();
  }, []);

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

  const handleInitiateCheckout = (passItem: PassRackItem) => {
    if (!passItem.current_holder) return;
    setCheckoutVisitor({
      id_visitor: passItem.current_holder.id_visitor,
      id_pass: passItem.id_pass,
      no_pass: passItem.no_pass,
      fullname: passItem.current_holder.fullname,
      institution: passItem.current_holder.institution,
      check_in_at: passItem.current_holder.check_in_at || new Date().toISOString(),
    });
    setShowCheckoutModal(true);
  };

  const handleConfirmCheckoutFromPass = async (visitorId: number, notes?: string) => {
    setProcessingCheckout(true);
    try {
      const res = await api.post(`/visitors/${visitorId}/checkout`, { notes });
      setShowCheckoutModal(false);
      setCheckoutVisitor(null);
      setFeedbackMessage({
        type: 'success',
        text: res.data.message || 'Check-out tamu berhasil dan kartu pass telah dikembalikan ke status tersedia.',
      });
      fetchPasses();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal memproses check-out pengunjung.';
      setFeedbackMessage({ type: 'error', text: msg });
    } finally {
      setProcessingCheckout(false);
    }
  };

  // Filtered passes
  const filteredPasses = passes.filter((p) => {
    const matchesSearch =
      p.no_pass.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.slot && p.slot.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.current_holder && p.current_holder.fullname.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const availableCount = passes.filter((p) => p.status === 'AVAILABLE').length;
  const inUseCount = passes.filter((p) => p.status === 'IN_USE').length;
  const maintenanceCount = passes.filter((p) => p.status === 'MAINTENANCE' || p.status === 'LOST').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-charcoal tracking-tight">Monitoring & Manajemen Pass Fisik</h2>
          <p className="text-xs text-charcoal-muted mt-0.5">
            Visualisasi rak kartu pass dan pengelolaan status kondisi fisik kartu
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchPasses}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-ivory-200 text-charcoal text-xs font-medium rounded-lg shadow-sm hover:bg-ivory-100 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-500' : ''}`} />
            <span>Segarkan</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-lg shadow transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Tambah Nomor Pass</span>
            </button>
          )}
        </div>
      </div>

      {feedbackMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between animate-fadeIn ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <span>{feedbackMessage.text}</span>
          <button onClick={() => setFeedbackMessage(null)} className="text-xs font-bold px-1">
            ✕
          </button>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-ivory-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-charcoal-muted uppercase">Total Kartu Pass</p>
            <p className="text-2xl font-extrabold text-charcoal mt-1">{passes.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-ivory-100 text-brand-800 flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-ivory-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-emerald-700 uppercase">Pass Tersedia (Rak)</p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">{availableCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-ivory-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-amber-700 uppercase">Sedang Digunakan</p>
            <p className="text-2xl font-extrabold text-amber-600 mt-1">{inUseCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-ivory-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-red-700 uppercase">Rusak / Hilang</p>
            <p className="text-2xl font-extrabold text-red-600 mt-1">{maintenanceCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Visual Physical Rack Grid (Figma Screen 5) */}
      <div className="bg-white rounded-2xl border border-ivory-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-ivory-200">
          <div>
            <h3 className="text-sm font-bold text-charcoal">Representasi Visual Rak Gantungan Pass</h3>
            <p className="text-[11px] text-charcoal-muted">
              Klik pada kartu pass untuk melihat status detail atau mengubah kondisi
            </p>
          </div>
          {/* Status Color Legend */}
          <div className="flex items-center space-x-3 text-[11px] font-medium">
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Tersedia</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Digunakan</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span>Perbaikan/Hilang</span>
            </span>
          </div>
        </div>

        {/* Rack Slot Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-3 pt-2">
          {passes.map((pass) => {
            const isAvailable = pass.status === 'AVAILABLE';
            const isInUse = pass.status === 'IN_USE';

            return (
              <div
                key={pass.id_pass}
                onClick={() => {
                  setSelectedPass(pass);
                  setNewStatus(pass.status);
                }}
                className={`p-3 rounded-2xl border cursor-pointer transition-all hover:scale-105 shadow-sm text-center flex flex-col items-center justify-between min-h-[96px] ${
                  isAvailable
                    ? 'bg-emerald-50/70 border-emerald-300 hover:border-emerald-500'
                    : isInUse
                    ? 'bg-amber-50/80 border-amber-300 hover:border-amber-500'
                    : 'bg-red-50/70 border-red-300 hover:border-red-500'
                }`}
              >
                <div className="w-full flex items-center justify-between text-[10px]">
                  <span className="font-mono text-charcoal-muted text-[9px]">{pass.slot ? pass.slot.split('-')[0].trim() : 'Rak'}</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isAvailable ? 'bg-emerald-500' : isInUse ? 'bg-amber-500 animate-ping' : 'bg-red-500'
                    }`}
                  />
                </div>

                <div className="my-1">
                  <span className="text-xl font-extrabold font-mono text-charcoal">
                    {pass.no_pass}
                  </span>
                </div>

                <span
                  className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-md ${
                    isAvailable
                      ? 'bg-emerald-200/80 text-emerald-800'
                      : isInUse
                      ? 'bg-amber-200/80 text-amber-900'
                      : 'bg-red-200/80 text-red-900'
                  }`}
                >
                  {isAvailable ? 'ADA' : isInUse ? 'DIPAKAI' : pass.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter and Table View */}
      <div className="bg-white rounded-2xl border border-ivory-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-ivory-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 text-charcoal-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nomor pass atau nama tamu..."
              className="w-full bg-ivory-50/60 border border-ivory-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center space-x-1.5 overflow-x-auto text-xs">
            {['ALL', 'AVAILABLE', 'IN_USE', 'MAINTENANCE', 'LOST'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  statusFilter === st
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'bg-ivory-100 text-charcoal-muted hover:bg-ivory-200 hover:text-charcoal'
                }`}
              >
                {st === 'ALL' ? 'Semua Pass' : st}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-ivory-100/70 text-[11px] uppercase tracking-wider text-charcoal-muted font-bold border-b border-ivory-200">
                <th className="py-3 px-4">Nomor Pass</th>
                <th className="py-3 px-4">Posisi Slot Rak</th>
                <th className="py-3 px-4">Status Kondisi</th>
                <th className="py-3 px-4">Pemegang Saat Ini</th>
                <th className="py-3 px-4">Waktu Check-In</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-200">
              {filteredPasses.length > 0 ? (
                filteredPasses.map((p) => (
                  <tr key={p.id_pass} className="hover:bg-ivory-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-brand-900 text-sm">
                      #{p.no_pass}
                    </td>
                    <td className="py-3 px-4 text-charcoal-muted">
                      {p.slot || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status === 'AVAILABLE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.status === 'IN_USE'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {p.current_holder ? (
                        <div className="font-semibold text-charcoal flex items-center space-x-1.5">
                          <User className="w-3.5 h-3.5 text-brand-500" />
                          <span>{p.current_holder.fullname}</span>
                          {p.current_holder.institution && (
                            <span className="text-[11px] text-charcoal-muted font-normal">
                              ({p.current_holder.institution})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-charcoal-muted text-[11px] italic">Tersedia di rak</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-charcoal-muted">
                      {p.current_holder?.check_in_at
                        ? new Date(p.current_holder.check_in_at).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          }) + ' WIB'
                        : '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {p.status === 'IN_USE' && p.current_holder ? (
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleInitiateCheckout(p)}
                            className="px-2.5 py-1 text-[11px] font-bold bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors flex items-center space-x-1 shadow-sm"
                          >
                            <LogOut className="w-3 h-3" />
                            <span>Check-Out</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedPass(p);
                              setNewStatus(p.status);
                            }}
                            className="px-2 py-1 text-[11px] font-semibold bg-ivory-100 hover:bg-ivory-200 text-charcoal rounded-lg transition-colors border border-ivory-200"
                          >
                            Ubah
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedPass(p);
                            setNewStatus(p.status);
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-ivory-100 hover:bg-ivory-200 text-brand-900 rounded-lg transition-colors border border-ivory-200"
                        >
                          Ubah Status
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-charcoal-muted">
                    Tidak ada kartu pass yang cocok dengan filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Ubah Status Pass */}
      {selectedPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-ivory-200 p-5 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-2 border-b border-ivory-200">
              <h3 className="text-sm font-bold text-charcoal">
                Ubah Kondisi Pass #{selectedPass.no_pass}
              </h3>
              <button onClick={() => setSelectedPass(null)} className="text-xs text-charcoal-muted hover:text-charcoal">
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Status Kartu Pass:</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-ivory-50 border border-ivory-200 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                >
                  <option value="AVAILABLE">AVAILABLE (Tersedia di Rak)</option>
                  <option value="IN_USE">IN_USE (Sedang Dibawa Tamu)</option>
                  <option value="MAINTENANCE">MAINTENANCE (Perlu Perbaikan / Patah)</option>
                  <option value="LOST">LOST (Hilang)</option>
                  <option value="INACTIVE">INACTIVE (Nonaktif Sementara)</option>
                </select>
              </div>

              {selectedPass.status === 'IN_USE' && newStatus === 'AVAILABLE' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] leading-relaxed">
                  <div className="font-bold flex items-center space-x-1 mb-0.5">
                    <span>⚠️ Perhatian Otomatis Check-Out:</span>
                  </div>
                  <span>
                    Kartu ini saat ini sedang dibawa oleh tamu{' '}
                    <strong>{selectedPass.current_holder?.fullname || 'aktif'}</strong>. Mengubah status menjadi{' '}
                    <strong>AVAILABLE</strong> akan otomatis memproses <strong>Check-Out</strong> bagi tamu tersebut.
                  </span>
                </div>
              )}

              <div>
                <label className="block font-semibold mb-1">Catatan Tambahan:</label>
                <textarea
                  rows={2}
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="Keterangan kondisi fisik kartu..."
                  className="w-full bg-ivory-50 border border-ivory-200 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedPass(null)}
                  className="flex-1 py-2 bg-ivory-100 text-charcoal font-semibold rounded-xl hover:bg-ivory-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updatingStatus}
                  className="flex-1 py-2 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 disabled:opacity-50"
                >
                  {updatingStatus ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tambah Pass Baru (Admin) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-ivory-200 p-5 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-2 border-b border-ivory-200">
              <h3 className="text-sm font-bold text-charcoal">Tambah Kartu Pass Baru</h3>
              <button onClick={() => setShowAddModal(false)} className="text-xs text-charcoal-muted hover:text-charcoal">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddPass} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">
                  Nomor Kartu Pass <span className="text-brand-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={newNoPass}
                  onChange={(e) => setNewNoPass(e.target.value)}
                  placeholder="Contoh: 21, A-05"
                  className="w-full bg-ivory-50 border border-ivory-200 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Posisi Slot Rak Fisik:</label>
                <input
                  type="text"
                  value={newSlot}
                  onChange={(e) => setNewSlot(e.target.value)}
                  placeholder="Contoh: Rak B - Slot 01"
                  className="w-full bg-ivory-50 border border-ivory-200 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 bg-ivory-100 text-charcoal font-semibold rounded-xl hover:bg-ivory-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={addingPass}
                  className="flex-1 py-2 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 disabled:opacity-50"
                >
                  {addingPass ? 'Menambahkan...' : 'Tambah Pass'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Check-Out Tamu dari Rak Pass */}
      <CheckoutConfirmModal
        isOpen={showCheckoutModal}
        visitor={checkoutVisitor}
        onClose={() => {
          setShowCheckoutModal(false);
          setCheckoutVisitor(null);
        }}
        onConfirm={handleConfirmCheckoutFromPass}
        loading={processingCheckout}
      />
    </div>
  );
}
