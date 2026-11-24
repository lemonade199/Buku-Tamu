'use client';

import React, { useState } from 'react';
import { formatJam } from '@/lib/datetime';
import { LogOut, CheckCircle2, AlertTriangle, User, Building, Clock, CreditCard, X } from 'lucide-react';

export interface ActiveVisitor {
  id_visitor: number;
  id_pass: number;
  no_pass?: string;
  fullname: string;
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


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm(visitor.id_visitor, notes);
    setNotes('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
        <div className="bg-[#8A001A] text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <LogOut className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Konfirmasi Check-Out Tamu</h2>
            
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Tutup dialog konfirmasi check-out"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <p className="font-bold">Verifikasi Kartu Pass Fisik:</p>
              <p className="mt-0.5">
                Pastikan kartu pass nomor <strong className="font-mono text-sm text-[#8A001A] bg-amber-100 px-1.5 py-0.5 rounded">#{visitor.no_pass || visitor.id_pass}</strong> telah diserahkan kembali ke meja resepsionis.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <span className="text-gray-600 flex items-center">
                <User className="w-3.5 h-3.5 mr-2 text-[#8A001A]" />
                Nama Pengunjung
              </span>
              <span className="font-bold text-gray-900">{visitor.fullname}</span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <span className="text-gray-600 flex items-center">
                <Building className="w-3.5 h-3.5 mr-2 text-[#8A001A]" />
                Instansi / Perusahaan
              </span>
              <span className="font-semibold text-gray-900">{visitor.institution || '-'}</span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <span className="text-gray-600 flex items-center">
                <Clock className="w-3.5 h-3.5 mr-2 text-[#8A001A]" />
                Jam Masuk
              </span>
              <div className="text-right">
                <span className="text-gray-900 font-medium tabular-nums">{formatJam(visitor.check_in_at)} WIB</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600 flex items-center">
                <CreditCard className="w-3.5 h-3.5 mr-2 text-[#8A001A]" />
                Nomor Kartu Pass
              </span>
              <span className="font-mono font-bold text-[#8A001A]">
                Pass #{visitor.no_pass || visitor.id_pass}
              </span>
            </div>
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-bold transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-[#8A001A] hover:bg-[#700015] text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center space-x-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#8A001A]"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Check-Out Tamu</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
