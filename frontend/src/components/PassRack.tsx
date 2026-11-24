'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { formatJam } from '@/lib/datetime';

type PassStatus = 'AVAILABLE' | 'PENDING' | 'IN_USE' | 'MAINTENANCE' | 'LOST';
type Filter = 'ALL' | 'AVAILABLE' | 'PENDING' | 'IN_USE';

interface RackSlot {
  id_pass: number;
  no_pass: string;
  slot?: string | null;
  status: PassStatus;
  holder: {
    fullname: string;
    institution?: string | null;
    check_in_at?: string | null;
  } | null;
}

interface RackSummary {
  TOTAL: number;
  AVAILABLE: number;
  PENDING: number;
  IN_USE: number;
}

// Tiga warna status mengikuti mockup Figma, dibuat lebih tenang supaya rak mudah dibaca sekilas.
const STATUS: Record<PassStatus, { label: string; tile: string; dot: string; meta: string }> = {
  AVAILABLE: {
    label: 'Tersedia',
    tile: 'bg-white border-gray-200 text-[#1A1918]',
    dot: 'bg-white border-2 border-gray-400',
    meta: 'text-gray-500',
  },
  PENDING: {
    label: 'Menunggu',
    tile: 'bg-amber-50 border-amber-300 text-amber-900',
    dot: 'bg-[#B45309]',
    meta: 'text-amber-800',
  },
  IN_USE: {
    label: 'Dipakai',
    tile: 'bg-[#4A000E] border-[#4A000E] text-white',
    dot: 'bg-[#4A000E]',
    meta: 'text-white/75',
  },
  MAINTENANCE: {
    label: 'Perbaikan',
    tile: 'bg-gray-100 border-gray-300 text-gray-700',
    dot: 'bg-gray-400',
    meta: 'text-gray-500',
  },
  LOST: {
    label: 'Hilang',
    tile: 'bg-gray-100 border-gray-300 text-gray-700',
    dot: 'bg-gray-400',
    meta: 'text-gray-500',
  },
};

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'ALL', label: 'Semua' },
  { key: 'AVAILABLE', label: 'Tersedia' },
  { key: 'PENDING', label: 'Menunggu' },
  { key: 'IN_USE', label: 'Dipakai' },
];

export default function PassRack() {
  const [slots, setSlots] = useState<RackSlot[]>([]);
  const [summary, setSummary] = useState<RackSummary>({ TOTAL: 0, AVAILABLE: 0, PENDING: 0, IN_USE: 0 });
  const [filter, setFilter] = useState<Filter>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchRack = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; summary: RackSummary; data: RackSlot[] }>('/pass/rack');
      setSlots(res.data.data || []);
      setSummary(res.data.summary);
      setError(false);
    } catch (err) {
      console.error('Gagal mengambil data rak kartu pass:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRack();
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchRack();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchRack]);

  const countFor = (key: Filter) => (key === 'ALL' ? summary.TOTAL : summary[key] ?? 0);

  const visibleSlots = filter === 'ALL' ? slots : slots.filter((s) => s.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#3B0A11] tracking-tight">Kartu Pass</h1>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            fetchRack();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-full text-xs font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A001A]"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? 'animate-spin motion-reduce:animate-none text-[#8A001A]' : ''}`}
            aria-hidden="true"
          />
          <span>Segarkan</span>
        </button>
      </div>

      {/* Ringkasan sekaligus filter: satu kontrol, angka jelas, warna titik sama dengan warna kartu di rak. */}
      <div
        className="inline-flex flex-wrap gap-1 p-1 bg-white border border-gray-200 rounded-2xl shadow-sm"
        role="group"
        aria-label="Saring kartu pass berdasarkan status"
      >
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={active}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A001A] ${
                active ? 'bg-[#3E2723] text-white' : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
              }`}
            >
              {f.key !== 'ALL' && (
                <span className={`w-2.5 h-2.5 rounded-full ${STATUS[f.key].dot}`} aria-hidden="true" />
              )}
              <span>{f.label}</span>
              <span
                className={`min-w-[24px] px-1.5 rounded-full text-xs tabular-nums ${
                  active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {countFor(f.key)}
              </span>
            </button>
          );
        })}
      </div>

      <section aria-label="Rak kartu pass" className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        {loading && slots.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-500">Memuat rak kartu pass...</p>
        ) : error && slots.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-700">
            <p>Data rak kartu pass belum bisa dimuat.</p>
            <button
              type="button"
              onClick={fetchRack}
              className="mt-3 px-4 py-1.5 bg-[#8A001A] hover:bg-[#700015] text-white rounded-full text-xs font-bold cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#8A001A]"
            >
              Coba lagi
            </button>
          </div>
        ) : visibleSlots.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-500">Tidak ada kartu pass dengan status ini.</p>
        ) : (
          <div className="p-4 sm:p-5">
                <ul className="grid grid-cols-[repeat(auto-fill,minmax(128px,1fr))] gap-3">
                  {visibleSlots.map((slot) => {
                    const st = STATUS[slot.status] ?? STATUS.MAINTENANCE;
                    return (
                      <li
                        key={slot.id_pass}
                        className={`rounded-xl border px-3.5 py-3 min-h-[104px] flex flex-col justify-between ${st.tile}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-2xl font-bold leading-none tabular-nums">
                            {slot.no_pass.padStart(2, '0')}
                          </span>
                          <span className="text-[11px] font-semibold">{st.label}</span>
                        </div>

                        {slot.holder ? (
                          <div className="mt-2 min-w-0">
                            <p className="text-xs font-semibold truncate" title={slot.holder.fullname}>
                              {slot.holder.fullname}
                            </p>
                            <p className={`text-[11px] truncate ${st.meta}`}>
                              {slot.holder.check_in_at ? `Masuk ${formatJam(slot.holder.check_in_at)}` : '-'}
                            </p>
                          </div>
                        ) : (
                          <p className={`mt-2 text-[11px] ${st.meta}`}>Siap dipakai</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
          </div>
        )}
      </section>
    </div>
  );
}
