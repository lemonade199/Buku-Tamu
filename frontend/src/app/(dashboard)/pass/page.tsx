'use client';

import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Search, Calendar, ChevronDown, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import PassRack from '@/components/PassRack';

interface PassMonitoringItem {
  id_visitor: number;
  no_pass: string;
  guest_name: string;
  institution: string;
  check_in_time: string;
  check_out_time: string;
  handed_over_by: string;
  received_by: string;
  status: 'Menunggu' | 'Dipakai' | 'Selesai';
  date?: string;
}

interface PassCounts {
  available: number;
  pending: number;
  in_use: number;
}

function MonitoringPassPage() {
  const [items, setItems] = useState<PassMonitoringItem[]>([]);
  const [counts, setCounts] = useState<PassCounts>({ available: 14, pending: 3, in_use: 2 });
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('Hari ini');
  const [dateFilterOpen, setDateFilterOpen] = useState(false);

  const [selectedStatus, setSelectedStatus] = useState('Semua status');
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);

  const [selectedReceptionist, setSelectedReceptionist] = useState('Semua resepsionis');
  const [receptionistFilterOpen, setReceptionistFilterOpen] = useState(false);

  const fetchMonitoringData = useCallback(async () => {
    try {
      const res = await api.get<{
        success: boolean;
        counts: PassCounts;
        data: PassMonitoringItem[];
      }>('/pass/monitoring');

      if (res.data.counts) {
        setCounts(res.data.counts);
      }
      setItems(res.data.data || []);
    } catch {
      // Tidak menyuntikkan data palsu agar operator tidak terkecoh
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMonitoringData();
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchMonitoringData();
    }, 5000);

    const onVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        fetchMonitoringData();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [fetchMonitoringData]);

  const filteredItems = items.filter((item) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      item.no_pass.toLowerCase().includes(term) ||
      item.guest_name.toLowerCase().includes(term) ||
      item.institution.toLowerCase().includes(term);

    const matchesStatus =
      selectedStatus === 'Semua status' || item.status === selectedStatus;

    const matchesReceptionist =
      selectedReceptionist === 'Semua resepsionis' ||
      item.handed_over_by.toLowerCase() === selectedReceptionist.toLowerCase() ||
      item.received_by.toLowerCase() === selectedReceptionist.toLowerCase();

    // Logika filter tanggal (Hari ini, Minggu ini, Bulan ini, Semua)
    let matchesDate = true;
    if (selectedDate !== 'Semua') {
      if (!item.date) {
        matchesDate = false;
      } else {
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

        if (selectedDate === 'Hari ini') {
          matchesDate = item.date === todayStr;
        } else if (selectedDate === 'Minggu ini') {
          const day = now.getDay();
          const diffToMonday = (day + 6) % 7;
          const monday = new Date(now);
          monday.setDate(now.getDate() - diffToMonday);
          const startOfWeekStr = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
          matchesDate = item.date >= startOfWeekStr && item.date <= todayStr;
        } else if (selectedDate === 'Bulan ini') {
          const monthPrefix = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
          matchesDate = item.date.startsWith(monthPrefix);
        }
      }
    }

    return matchesSearch && matchesStatus && matchesReceptionist && matchesDate;
  });

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#3B0A11] tracking-tight">
          Monitoring Kartu Pass
        </h1>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            fetchMonitoringData();
          }}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-full text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-2xs transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#8A001A]' : ''}`} />
          <span>Segarkan</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-3xl">
        <div className="bg-white rounded-2xl py-4 px-5 border border-gray-200 shadow-sm flex items-center">
          <div className="min-w-0">
            <span className="text-sm font-medium text-gray-600 block">
              Tersedia
            </span>
            <span className="text-3xl sm:text-4xl font-bold text-[#8A001A] mt-1 block tabular-nums">
              {counts.available}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl py-4 px-5 border border-gray-200 shadow-sm flex items-center">
          <div className="min-w-0">
            <span className="text-sm font-medium text-gray-600 block">
              Menunggu
            </span>
            <span className="text-3xl sm:text-4xl font-bold text-[#8A001A] mt-1 block tabular-nums">
              {counts.pending}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl py-4 px-5 border border-gray-200 shadow-sm flex items-center">
          <div className="min-w-0">
            <span className="text-sm font-medium text-gray-600 block">
              Dipakai
            </span>
            <span className="text-3xl sm:text-4xl font-bold text-[#8A001A] mt-1 block tabular-nums">
              {counts.in_use}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama / no. pass"
            aria-label="Cari nama atau nomor pass"
            className="w-full bg-white border border-gray-300 rounded-full pl-11 pr-4 py-1.5 text-xs text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30 focus:border-[#8A001A] shadow-xs font-medium"
          />
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setDateFilterOpen(!dateFilterOpen)}
            className="inline-flex items-center space-x-2 bg-white border border-gray-300 rounded-full px-4 py-1.5 text-xs font-semibold text-gray-800 shadow-xs hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-gray-700" />
            <span>{selectedDate}</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-700 ml-1" />
          </button>

          {dateFilterOpen && (
            <div className="absolute left-0 mt-2 py-1 bg-white border border-gray-300 rounded-2xl shadow-xl z-20 w-40 text-xs">
              {['Hari ini', 'Minggu ini', 'Bulan ini', 'Semua'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setSelectedDate(d);
                    setDateFilterOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 font-medium text-gray-800 cursor-pointer"
                >
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setStatusFilterOpen(!statusFilterOpen)}
            className="inline-flex items-center space-x-2 bg-white border border-gray-300 rounded-full px-4 py-1.5 text-xs font-semibold text-gray-800 shadow-xs hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <span>{selectedStatus}</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-700 ml-1" />
          </button>

          {statusFilterOpen && (
            <div className="absolute left-0 mt-2 py-1 bg-white border border-gray-300 rounded-2xl shadow-xl z-20 w-40 text-xs">
              {['Semua status', 'Menunggu', 'Dipakai', 'Selesai'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setSelectedStatus(s);
                    setStatusFilterOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 font-medium text-gray-800 cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setReceptionistFilterOpen(!receptionistFilterOpen)}
            className="inline-flex items-center space-x-2 bg-white border border-gray-300 rounded-full px-4 py-1.5 text-xs font-semibold text-gray-800 shadow-xs hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <span>{selectedReceptionist}</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-700 ml-1" />
          </button>

          {receptionistFilterOpen && (
            <div className="absolute left-0 mt-2 py-1 bg-white border border-gray-300 rounded-2xl shadow-xl z-20 w-48 text-xs">
              {['Semua resepsionis', 'Rina', 'Dina', 'Tasha', 'Petugas Resepsionis'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setSelectedReceptionist(r);
                    setReceptionistFilterOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 font-medium text-gray-800 cursor-pointer"
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-2xl border border-[#E8DCCB] shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-400">
              <th scope="col" className="py-3 px-3 text-xs font-semibold text-gray-600">No. pass</th>
              <th scope="col" className="py-3 px-3 text-xs font-semibold text-gray-600">Tamu</th>
              <th scope="col" className="py-3 px-3 text-xs font-semibold text-gray-600">Instansi</th>
              <th scope="col" className="py-3 px-3 text-xs font-semibold text-gray-600">Jam masuk</th>
              <th scope="col" className="py-3 px-3 text-xs font-semibold text-gray-600">Jam keluar</th>
              <th scope="col" className="py-3 px-3 text-xs font-semibold text-gray-600">Diserahkan oleh</th>
              <th scope="col" className="py-3 px-3 text-xs font-semibold text-gray-600">Diterima oleh</th>
              <th scope="col" className="py-3 px-3 text-xs font-semibold text-gray-600 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300/80 text-xs text-gray-800">
            {loading && items.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-500 font-medium">
                  <div className="w-6 h-6 border-2 border-[#8A001A] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <span>Memuat data monitoring kartu pass...</span>
                </td>
              </tr>
            ) : filteredItems.length > 0 ? (
              filteredItems.map((r) => (
                <tr key={r.id_visitor} className="hover:bg-black/5 transition-colors">
                  <td className="py-3 px-3">
                    <span className="inline-block bg-[#4A000E] text-white font-extrabold text-xs px-3.5 py-0.5 rounded-full shadow-2xs min-w-[36px] text-center">
                      {r.no_pass}
                    </span>
                  </td>

                  <td className="py-3 px-3 font-semibold text-gray-900 whitespace-nowrap">
                    {r.guest_name}
                  </td>

                  <td className="py-3 px-3 text-gray-800 font-medium">
                    {r.institution}
                  </td>

                  <td className="py-3 px-3 font-medium text-gray-800 whitespace-nowrap">
                    {r.check_in_time}
                  </td>

                  <td className="py-3 px-3 font-medium text-gray-800 whitespace-nowrap">
                    {r.check_out_time}
                  </td>

                  <td className="py-3 px-3 text-gray-800 font-medium whitespace-nowrap">
                    {r.handed_over_by}
                  </td>

                  <td className="py-3 px-3 text-gray-800 font-medium whitespace-nowrap">
                    {r.received_by}
                  </td>

                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    {r.status === 'Menunggu' ? (
                      <span className="inline-block px-4 py-0.5 bg-[#D97706] text-white text-[11px] font-bold rounded-full min-w-[80px] text-center shadow-2xs">
                        Menunggu
                      </span>
                    ) : r.status === 'Dipakai' ? (
                      <span className="inline-block px-4 py-0.5 bg-[#6B0014] text-white text-[11px] font-bold rounded-full min-w-[80px] text-center shadow-2xs">
                        Dipakai
                      </span>
                    ) : (
                      <span className="inline-block px-4 py-0.5 bg-[#5B6367] text-white text-[11px] font-bold rounded-full min-w-[80px] text-center shadow-2xs">
                        Selesai
                      </span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-500 font-medium">
                  Tidak ada kartu pass yang cocok dengan filter pencarian.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Resepsionis melihat rak kartu pass, admin tetap melihat tabel monitoring.
export default function PassPage() {
  const { user } = useAuth();
  return user?.role_code === 'ADMIN' ? <MonitoringPassPage /> : <PassRack />;
}
