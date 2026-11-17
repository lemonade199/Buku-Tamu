'use client';

import React, { useState, useEffect } from 'react';
import { PassItem } from '@/types';
import PassSelector from '@/components/PassSelector';
import { CreditCard, CheckCircle2, User, Building, Briefcase, ArrowLeft } from 'lucide-react';

interface PassAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  visitorData: {
    fullname: string;
    telephone: string;
    institution?: string;
    representing?: string;
    purpose?: string;
    photoBase64: string;
  } | null;
  availablePasses: PassItem[];
  loadingPasses: boolean;
  onConfirm: (selectedPassNo: string) => Promise<void>;
  submitting: boolean;
}

export default function PassAllocationModal({
  isOpen,
  onClose,
  visitorData,
  availablePasses,
  loadingPasses,
  onConfirm,
  submitting,
}: PassAllocationModalProps) {
  const [selectedPassNo, setSelectedPassNo] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Default selection to first available pass
  useEffect(() => {
    if (availablePasses.length > 0 && !selectedPassNo) {
      setSelectedPassNo(availablePasses[0].no_pass);
    }
  }, [availablePasses, selectedPassNo]);

  if (!isOpen || !visitorData) return null;

  const handleConfirm = async () => {
    if (!selectedPassNo) {
      setError('Silakan pilih salah satu kartu pass yang tersedia di rak.');
      return;
    }
    setError('');
    await onConfirm(selectedPassNo);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-ivory-200 animate-scaleUp">
        {/* Header */}
        <div className="bg-brand-500 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
              <CreditCard className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Pilih & Alokasikan Kartu Pass</h3>
              <p className="text-xs text-white/80">Langkah terpisah penyerahan kartu pass fisik tamu</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Visitor Brief Card */}
          <div className="p-3.5 bg-ivory-50 rounded-2xl border border-ivory-200 flex items-center space-x-4">
            {/* Visitor Photo */}
            <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-brand-500/30 bg-neutral-900 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={visitorData.photoBase64}
                alt="Foto Tamu"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                <span className="font-bold text-sm text-charcoal truncate">{visitorData.fullname}</span>
              </div>
              <div className="flex items-center space-x-3 text-xs text-charcoal-muted">
                <span className="flex items-center space-x-1 truncate">
                  <Building className="w-3 h-3 text-charcoal-muted/70 shrink-0" />
                  <span>{visitorData.institution || 'Tamu Umum'}</span>
                </span>
                <span>•</span>
                <span className="flex items-center space-x-1 truncate">
                  <Briefcase className="w-3 h-3 text-charcoal-muted/70 shrink-0" />
                  <span>Menemui: {visitorData.representing || '-'}</span>
                </span>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Pass Selector Section */}
          <div className="space-y-2">
            <PassSelector
              availablePasses={availablePasses}
              selectedPassNo={selectedPassNo}
              onSelectPass={(no) => {
                setSelectedPassNo(no);
                setError('');
              }}
              loading={loadingPasses}
            />
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 leading-relaxed">
            💡 Pastikan nomor kartu fisik yang Anda ambil dari rak gantungan sama persis dengan kartu nomor <strong>#{selectedPassNo || '...'}</strong> yang dipilih.
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 bg-ivory-100 hover:bg-ivory-200 text-charcoal text-xs font-semibold rounded-xl border border-ivory-200 transition-colors flex items-center space-x-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali</span>
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting || !selectedPassNo}
              className="flex-1 py-3 px-4 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Menyimpan & Menyerahkan Pass...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Konfirmasi Serahkan Pass #{selectedPassNo || ''}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
