'use client';

import React, { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '@/lib/api';
import type { MonthlyStat } from '@/types';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTH_LONG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

interface Row {
  month: string;
  monthLong: string;
  count: number;
}

function MonthTooltip({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-xl border border-[#E8DCCB] bg-white px-3 py-2 text-xs shadow-md">
      <div className="font-semibold text-[#3B0A11]">{row.monthLong}</div>
      <div className="text-gray-700 tabular-nums">{row.count} kunjungan</div>
    </div>
  );
}

export default function MonthlyVisitsChart() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);
  const year = new Date().getFullYear();

  useEffect(() => {
    api
      .get<{ success: boolean; data: { monthly_stats?: MonthlyStat[] } }>('/dashboard/metrics')
      .then((res) => {
        const stats = res.data.data.monthly_stats ?? [];
        // Backend mengirim 12 bulan berurutan; nama bulan disusun ulang di sini supaya ejaannya seragam.
        setRows(MONTH_SHORT.map((m, i) => ({ month: m, monthLong: MONTH_LONG[i], count: stats[i]?.count ?? 0 })));
      })
      .catch((err) => {
        console.error('Gagal mengambil statistik bulanan:', err);
        setFailed(true);
      });
  }, []);

  const total = rows?.reduce((sum, r) => sum + r.count, 0) ?? 0;
  const busiest = rows?.reduce<Row | null>((best, r) => (r.count > (best?.count ?? 0) ? r : best), null);

  return (
    <section aria-labelledby="monthly-chart-title" className="relative bg-white rounded-2xl border border-[#E8DCCB] shadow-sm p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 mb-4">
        <h2 id="monthly-chart-title" className="text-lg font-semibold text-[#3B0A11]">
          Kunjungan per bulan, {year}
        </h2>
        {rows && (
          <dl className="flex gap-6 text-xs">
            <div>
              <dt className="text-gray-600">Total tahun ini</dt>
              <dd className="text-xl font-bold text-[#3B0A11] tabular-nums">{total}</dd>
            </div>
            {busiest && (
              <div>
                <dt className="text-gray-600">Bulan tersibuk</dt>
                <dd className="text-xl font-bold text-[#3B0A11]">{busiest.monthLong}</dd>
              </div>
            )}
          </dl>
        )}
      </div>

      {failed ? (
        <p className="py-10 text-center text-sm text-gray-600">Grafik bulanan belum bisa dimuat. Coba muat ulang halaman.</p>
      ) : !rows ? (
        <div className="h-64 rounded-xl bg-[#FAF7F0] animate-pulse motion-reduce:animate-none" aria-hidden="true" />
      ) : (
        <>
          <div className="h-64" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }} barCategoryGap="28%">
                <CartesianGrid vertical={false} stroke="#EFE7DA" />
                <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: '#D9CBB5' }} tick={{ fontSize: 11, fill: '#4B5563' }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#4B5563' }} />
                <Tooltip content={<MonthTooltip />} cursor={{ fill: 'rgba(138, 0, 26, 0.06)' }} />
                <Bar dataKey="count" fill="#8A001A" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Versi tabel untuk pembaca layar. */}
          <table className="sr-only">
            <caption>Kunjungan per bulan tahun {year}</caption>
            <thead>
              <tr>
                <th scope="col">Bulan</th>
                <th scope="col">Kunjungan</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.month}>
                  <td>{r.monthLong}</td>
                  <td>{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
