'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Questrial } from 'next/font/google';
import { Clock, Menu } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getUserAvatarUrl } from '@/lib/api';

// Sama dengan halaman tamu dan login supaya identitas SEAMOLEC konsisten.
const wordmarkFont = Questrial({ weight: '400', subsets: ['latin'], display: 'swap' });

interface TopbarProps {
  onOpenMenu: () => void;
}

export default function Topbar({ onOpenMenu }: TopbarProps) {
  const { user } = useAuth();
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setTimeStr(`${days[now.getDay()]}, ${day} ${months[now.getMonth()]} ${now.getFullYear()} · ${hours}:${minutes}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const roleLabel = user?.role_code === 'ADMIN' ? 'Admin' : 'Resepsionis';
  const userName = user?.fullname || 'Pengguna';
  const initial = userName.trim().charAt(0).toUpperCase() || '?';

  // Data login dari backend tidak menyertakan info foto, jadi foto selalu dicoba dimuat dari server.
  // Kalau server menjawab "tidak ada foto", tampilan kembali ke huruf inisial.
  // Nilai avatar (diisi halaman Profil setelah ganti foto) ikut di URL supaya foto baru tidak tertahan cache.
  const [avatarFailed, setAvatarFailed] = useState(false);
  useEffect(() => setAvatarFailed(false), [user?.id_user, user?.avatar]);
  let avatarSrc: string | null = null;
  if (user && !avatarFailed) {
    const base = getUserAvatarUrl(user.id_user);
    avatarSrc = `${base}${base.includes('?') ? '&' : '?'}v=${encodeURIComponent(user.avatar || 'awal')}`;
  }

  return (
    <header className="h-16 bg-[#8A001A] text-white flex items-center justify-between gap-3 px-4 sm:px-6 shadow-md border-b border-black/30 z-20 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Buka menu"
          aria-controls="dashboard-sidebar"
          className="md:hidden p-2 -ml-2 rounded-lg text-white/90 hover:bg-white/10 active:bg-white/20 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
        </button>

        <Link
          href="/dashboard"
          className="flex items-center gap-3 min-w-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <span className="w-10 h-10 rounded-full bg-white flex items-center justify-center p-1 shadow-sm shrink-0">
            <img src="/seamolec-logo.png" alt="" width={40} height={40} className="w-full h-full object-contain" />
          </span>
          <span className={`${wordmarkFont.className} text-xl sm:text-2xl leading-none tracking-[0.06em]`}>SEAMOLEC</span>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden lg:flex items-center gap-2 bg-white text-gray-800 text-xs px-4 py-1.5 rounded-full border border-gray-200 font-medium">
          <Clock className="w-3.5 h-3.5 text-gray-500 shrink-0" aria-hidden="true" />
          <span>{timeStr || 'Memuat waktu...'}</span>
        </div>

        <Link
          href="/profile"
          className="flex items-center gap-2.5 rounded-xl px-2 py-1 hover:bg-white/10 active:bg-white/15 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <span
            className="w-9 h-9 rounded-full bg-[#FEF7EC] text-[#8A001A] flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden ring-2 ring-white/70"
            aria-hidden="true"
          >
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt=""
                width={36}
                height={36}
                className="w-full h-full object-cover"
                onError={() => setAvatarFailed(true)}
              />
            ) : (
              initial
            )}
          </span>
          <span className="hidden sm:block text-left leading-tight">
            <span className="block text-xs font-semibold">{userName}</span>
            <span className="block text-[11px] text-white/75">{roleLabel} · Lihat profil</span>
          </span>
          <span className="sr-only sm:hidden">Profil {userName}</span>
        </Link>
      </div>
    </header>
  );
}