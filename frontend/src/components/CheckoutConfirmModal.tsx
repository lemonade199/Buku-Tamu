'use client';

import React, { useState } from 'react';
import { LogOut, CheckCircle2, AlertTriangle, User, Building, Clock, CreditCard, X } from 'lucide-react';

export interface ActiveVisitor {
  id_visitor: number;
  id_pass: number;
  no_pass?: string;
  fullname: string;
  telephone?: string;
  institution?: string;
  representing?: string;
  purpose?: string;
  check_in_at: string;
  capture_id?: string;
}

interface CheckoutConfirmModalProps {
  isOpen: boolean;
  visitor: ActiveVisitor | null;
  onClose: () => void;
  onConfirm: (visitorId: number, notes?: string) => Promise<void>;
  loading: boolean;
}

export default function CheckoutConfirmModal({
  isOpen,
  visitor,
  onClose,
  onConfirm,
  loading,
}: CheckoutConfirmModalProps) {
  const [notes, setNotes] = useState('');

  if (!isOpen || !visitor) return null;

  const checkinTime = new Date(visitor.check_in_at);
  const now = new Date();
  const diffMinutes = Math.max(1, Math.round((now.getTime() - checkinTime.getTime()) / (1000 * 60)));
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  const durationStr = hours > 0 ? `${hours} jam ${minutes} menit` : `${minutes} menit`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm(visitor.id_visitor, notes);
    setNotes('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-brand-500/20">
        {/* Header Maroon */}
        <div className="bg-brand-500 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <LogOut className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Konfirmasi Check-Out Tamu</h3>
              <p className="text-[11px] text-white/80">Pastikan kartu pass fisik telah diterima kembali</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Card Pass Alert */}
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <p className="font-bold">Verifikasi Kartu Pass Fisik:</p>
              <p className="mt-0.5">
                Pastikan kartu pass nomor <strong className="font-mono text-sm text-brand-900 bg-amber-100 px-1.5 py-0.5 rounded">#{visitor.no_pass || visitor.id_pass}</strong> telah diserahkan kembali oleh pengunjung ke meja resepsionis sebelum menyelesaikan proses ini.
              </p>
            </div>
          </div>

          {/* Visitor Details Summary */}
          <div className="bg-ivory-50 rounded-2xl border border-ivory-200 p-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-ivory-200">
              <span className="text-charcoal-muted flex items-center">
                <User className="w-3.5 h-3.5 mr-2 text-brand-500" />
                Nama Pengunjung
              </span>
              <span className="font-bold text-charcoal">{visitor.fullname}</span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-ivory-200">
              <span className="text-charcoal-muted flex items-center">
                <Building className="w-3.5 h-3.5 mr-2 text-brand-500" />
                Instansi / Perusahaan
              </span>
              <span className="font-semibold text-charcoal">{visitor.institution || '-'}</span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-ivory-200">
              <span className="text-charcoal-muted flex items-center">
                <Clock className="w-3.5 h-3.5 mr-2 text-brand-500" />
                Waktu Masuk & Durasi
              </span>
              <div className="text-right">
                <span className="font-mono text-charcoal">
                  {checkinTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                </span>
                <span className="ml-1.5 text-[10px] bg-brand-50 text-brand-700 font-semibold px-2 py-0.5 rounded-full">
                  {durationStr}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-charcoal-muted flex items-center">
                <CreditCard className="w-3.5 h-3.5 mr-2 text-brand-500" />
                Nomor Kartu Pass
              </span>
              <span className="font-mono font-bold text-brand-900 text-sm">
                Pass #{visitor.no_pass || visitor.id_pass}
              </span>
            </div>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">
              Catatan Kepulangan (Opsional):
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Dokumen telah diserahkan, kondisi pass baik"
              className="w-full border border-ivory-200 rounded-xl px-3.5 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-charcoal text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Konfirmasi & Kembalikan Pass</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
