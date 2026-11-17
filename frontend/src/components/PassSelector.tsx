'use client';

import React from 'react';
import { PassItem } from '@/types';
import { CreditCard, Check } from 'lucide-react';

interface PassSelectorProps {
  availablePasses: PassItem[];
  selectedPassNo: string | null;
  onSelectPass: (noPass: string) => void;
  loading?: boolean;
}

export default function PassSelector({
  availablePasses,
  selectedPassNo,
  onSelectPass,
  loading = false,
}: PassSelectorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-charcoal">
          Pilih Kartu Pass Fisik Yang Tersedia:
        </label>
        <span className="text-[11px] text-emerald-600 font-medium">
          {availablePasses.length} kartu siap digunakan
        </span>
      </div>

      {loading ? (
        <div className="flex items-center space-x-2 py-4 text-xs text-charcoal-muted">
          <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <span>Memuat ketersediaan kartu pass...</span>
        </div>
      ) : availablePasses.length === 0 ? (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
          ⚠️ <strong>Kartu pass habis!</strong> Semua kartu sedang digunakan. Tamu yang selesai harus check-out terlebih dahulu agar kartu kembali tersedia.
        </div>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-48 overflow-y-auto p-1.5 border border-ivory-200 rounded-xl bg-ivory-50/60">
          {availablePasses.map((pass) => {
            const isSelected = selectedPassNo === pass.no_pass;
            return (
              <button
                key={pass.id_pass}
                type="button"
                onClick={() => onSelectPass(pass.no_pass)}
                className={`relative py-2.5 px-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center space-y-0.5 ${
                  isSelected
                    ? 'bg-brand-500 text-white border-brand-600 shadow-md scale-105 z-10'
                    : 'bg-white text-charcoal border-ivory-200 hover:border-brand-500/50 hover:bg-brand-50/40'
                }`}
              >
                {isSelected && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-white ring-2 ring-white">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
                <CreditCard className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-charcoal-muted'}`} />
                <span className="font-mono text-xs font-bold leading-tight">
                  {pass.no_pass}
                </span>
                <span className={`text-[9px] uppercase tracking-wider ${isSelected ? 'text-white/80' : 'text-emerald-600'}`}>
                  {pass.slot ? pass.slot.split('-')[0].trim() : 'Rak'}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
