'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, CreditCard, User, Building, Clock, ArrowRight, PlusCircle } from 'lucide-react';

interface CheckinResult {
  id_visitor: number;
  fullname: string;
  id_pass: number;
  no_pass: string;
  slot?: string;
  check_in_at: string;
}

interface CheckinSuccessModalProps {
  isOpen: boolean;
  result: CheckinResult | null;
  onReset: () => void;
}

export default function CheckinSuccessModal({
  isOpen,
  result,
  onReset,
}: CheckinSuccessModalProps) {
  const router = useRouter();

  if (!isOpen || !result) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      {/* Figma Screen 4 Pop-up Modal */}
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-brand-500/20 animate-scaleUp">
        {/* Top Crimson Maroon Banner */}
        <div className="bg-brand-500 text-white p-7 text-center relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <CheckCircle2 className="w-7 h-7 text-white" />
          </div>
          <span className="text-[11px] uppercase tracking-widest font-semibold text-white/80">
            Registrasi Berhasil
          </span>
          <h3 className="text-xl font-extrabold text-white mt-0.5 tracking-tight">
            Check-In Tamu Diterima
          </h3>

          {/* Large Pass Number Card (sesuai acuan Figma) */}
          <div className="mt-5 p-4 rounded-2xl bg-brand-950/60 border border-white/20 text-center shadow-inner">
            <p className="text-xs text-white/80 font-medium">Nomor pass anda:</p>
            <div className="text-5xl font-extrabold font-mono text-amber-300 tracking-wider my-1">
              {result.no_pass}
            </div>
            <p className="text-[11px] text-white/70">
              Posisi: {result.slot || `Rak Kartu Utama`}
            </p>
          </div>
        </div>

        {/* Visitor Details Summary */}
        <div className="p-6 space-y-4">
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-ivory-200">
              <span className="text-charcoal-muted flex items-center">
                <User className="w-3.5 h-3.5 mr-2 text-brand-500" />
                Nama Pengunjung
              </span>
              <span className="font-bold text-charcoal">{result.fullname}</span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-ivory-200">
              <span className="text-charcoal-muted flex items-center">
                <Clock className="w-3.5 h-3.5 mr-2 text-brand-500" />
                Waktu Masuk
              </span>
              <span className="font-semibold text-charcoal font-mono">
                {new Date(result.check_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-charcoal-muted flex items-center">
                <CreditCard className="w-3.5 h-3.5 mr-2 text-brand-500" />
                Status Kartu Pass
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                SEDANG DIGUNAKAN
              </span>
            </div>
          </div>

          <div className="p-3 bg-ivory-50 rounded-xl border border-ivory-200 text-[11px] text-charcoal-muted text-center leading-relaxed">
            📢 <strong>PENTING:</strong> Ambil kartu fisik bernomor <strong>{result.no_pass}</strong> dari rak dan serahkan kepada pengunjung sebagai tanda pengenal.
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={onReset}
              className="w-full py-3 px-4 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl shadow transition-colors flex items-center justify-center space-x-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Daftarkan Tamu Lain</span>
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="w-full py-2.5 px-4 bg-ivory-100 hover:bg-ivory-200 text-charcoal text-xs font-semibold rounded-xl border border-ivory-200 transition-colors flex items-center justify-center space-x-2"
            >
              <span>Kembali ke Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
