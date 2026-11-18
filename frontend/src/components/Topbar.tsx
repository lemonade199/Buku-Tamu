'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Clock, User as UserIcon, LogOut } from 'lucide-react';

export default function Topbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

      const dayName = days[now.getDay()];
      const dayDate = String(now.getDate()).padStart(2, '0');
      const monthName = months[now.getMonth()];
      const year = now.getFullYear();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');

      setTimeStr(`${dayName}, ${dayDate} ${monthName} ${year} · ${hours}:${minutes}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const roleLabel = user?.role_code === 'ADMIN' ? 'Admin' : 'Resepsionis';
  const userName = user?.fullname || 'Pengguna';

  return (
    <header className="h-16 bg-[#8A001A] text-white flex items-center justify-between px-6 shadow-md border-b border-black/40 z-30 shrink-0">
      <div className="flex items-center space-x-3 cursor-pointer" onClick={() => router.push('/dashboard')}>
        <img
          src="/seamolec-logo.jpg"
          alt="SEAMOLEC Logo"
          className="w-10 h-10 rounded-full object-contain bg-white p-0.5 shadow-sm"
        />
        <span className="text-2xl font-bold tracking-tight text-white font-sans lowercase select-none">
          seamolec
        </span>
      </div>

      <div className="flex items-center space-x-4">
        <div className="hidden sm:flex items-center space-x-2 bg-white text-gray-800 text-xs px-4 py-1.5 rounded-full shadow-inner border border-gray-300 font-medium">
          <Clock className="w-3.5 h-3.5 text-gray-600 shrink-0" />
          <span>{timeStr || 'Selasa, 10 Nov 2026 · 14:30'}</span>
        </div>

        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-full bg-gray-400 flex items-center justify-center text-gray-100 shrink-0 shadow-xs border border-white/20">
            <UserIcon className="w-5 h-5 text-gray-200" />
          </div>
          <div className="text-left text-white leading-tight">
            <div className="text-xs font-bold leading-none mb-1">
              {roleLabel}: {userName}
            </div>
            <button
              onClick={() => router.push('/profile')}
              className="text-[11px] text-white/80 hover:text-white hover:underline transition-colors block text-left cursor-pointer"
            >
              Ubah profil &rsaquo;
            </button>
          </div>

          <button
            onClick={() => logout()}
            title="Keluar / Logout"
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors ml-2"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
