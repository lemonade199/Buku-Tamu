'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Questrial } from 'next/font/google';
import { Clock, Menu, Bell, Check, UserCheck, AlertTriangle, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import api, { getUserAvatarUrl, resolveServerUrl } from '@/lib/api';
import { formatJam, parseServerDate } from '@/lib/datetime';

// Sama dengan halaman tamu dan login supaya identitas SEAMOLEC konsisten.
const wordmarkFont = Questrial({ weight: '400', subsets: ['latin'], display: 'swap' });

interface TopbarProps {
  onOpenMenu: () => void;
}

export default function Topbar({ onOpenMenu }: TopbarProps) {
  const { user } = useAuth();
  const [timeStr, setTimeStr] = useState<string>('');
  const [institutionName, setInstitutionName] = useState<string>('seamolec');
  const [logoUrl, setLogoUrl] = useState<string>('/seamolec-logo.png');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const fetchPublicSettings = async () => {
    try {
      const res = await api.get('/settings/public');
      if (res.data?.success && res.data?.data) {
        if (res.data.data.institution_name) {
          setInstitutionName(res.data.data.institution_name);
        }
        if (res.data.data.logo_url) {
          setLogoUrl(resolveServerUrl(res.data.data.logo_url) || '/seamolec-logo.png');
        }
      }
    } catch {
      // fallback to default
    }
  };

  useEffect(() => {
    fetchPublicSettings();

    const handleSettingsUpdated = (e: any) => {
      if (e?.detail?.institution_name) {
        setInstitutionName(e.detail.institution_name);
      }
      if (e?.detail?.logo_url) {
        setLogoUrl(resolveServerUrl(e.detail.logo_url) || '/seamolec-logo.png');
      } else {
        fetchPublicSettings();
      }
    };

    window.addEventListener('institution-settings-updated', handleSettingsUpdated);
    return () => {
      window.removeEventListener('institution-settings-updated', handleSettingsUpdated);
    };
  }, []);

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

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/settings/notifications');
      if (res.data?.success) {
        setNotifications(res.data.data || []);
        setUnreadCount(res.data.unread_count || 0);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
    const notifInterval = setInterval(fetchNotifications, 15000);

    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      clearInterval(notifInterval);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.post(`/settings/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id_notification === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/settings/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

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
            {/* Logo dan nama instansi diambil dari Pengaturan. */}
            <img
              src={logoUrl}
              alt=""
              width={40}
              height={40}
              onError={() => setLogoUrl('/seamolec-logo.png')}
              className="w-full h-full object-contain"
            />
          </span>
          <span className={`${wordmarkFont.className} text-xl sm:text-2xl leading-none tracking-[0.06em] uppercase truncate`}>
            {institutionName}
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden lg:flex items-center gap-2 bg-white text-gray-800 text-xs px-4 py-1.5 rounded-full border border-gray-200 font-medium">
          <Clock className="w-3.5 h-3.5 text-gray-500 shrink-0" aria-hidden="true" />
          <span>{timeStr || 'Memuat waktu...'}</span>
        </div>

        {/* In-app Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            aria-label={unreadCount > 0 ? `Notifikasi, ${unreadCount} belum dibaca` : 'Notifikasi'}
            aria-expanded={showNotifMenu}
            className="relative p-2 text-white/80 hover:text-white hover:bg-white/10 active:bg-white/20 rounded-full transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Bell className="w-5 h-5" aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse shadow-sm">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 text-gray-800 z-50 overflow-hidden animate-fadeIn">
              <div className="bg-[#FAF3F0] p-3.5 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-xs text-[#8A001A] uppercase tracking-wide">
                    Notifikasi Sistem
                  </span>
                  {unreadCount > 0 && (
                    <span className="bg-[#8A001A] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {unreadCount} baru
                    </span>
                  )}
                </div>
                {/* Selalu tampil; nonaktif kalau semua sudah dibaca, supaya posisinya mudah ditemukan. */}
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={unreadCount === 0}
                  className="text-[11px] text-[#8A001A] flex items-center gap-1 font-semibold px-2 py-1 rounded-full hover:bg-[#8A001A]/10 active:bg-[#8A001A]/15 cursor-pointer disabled:text-gray-400 disabled:hover:bg-transparent disabled:cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A001A]"
                >
                  <Check className="w-3 h-3" aria-hidden="true" />
                  <span>{unreadCount === 0 ? 'Semua sudah dibaca' : 'Tandai semua dibaca'}</span>
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-500">
                    Belum ada notifikasi sistem saat ini.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id_notification}
                      onClick={() => !notif.is_read && handleMarkAsRead(notif.id_notification)}
                      className={`p-3.5 transition-colors cursor-pointer flex items-start space-x-3 ${
                        notif.is_read ? 'bg-white hover:bg-gray-50 opacity-75' : 'bg-rose-50/50 hover:bg-rose-50'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {notif.type === 'CHECKIN' ? (
                          <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                            <UserCheck className="w-4 h-4" />
                          </div>
                        ) : notif.type === 'CHECKOUT' ? (
                          <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                            <LogOut className="w-4 h-4" />
                          </div>
                        ) : notif.type === 'BACKUP_FAIL' ? (
                          <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                            <Bell className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-gray-900 truncate">
                            {notif.title}
                          </h4>
                          {!notif.is_read && (
                            <span className="w-2 h-2 rounded-full bg-[#8A001A] shrink-0 ml-2" />
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5 leading-snug">
                          {notif.message}
                        </p>
                        <span className="text-[10px] text-gray-400 mt-1 block">
                          {/* Waktu dari server dalam UTC; parseServerDate mengubahnya ke jam lokal (WIB). */}
                          {formatJam(notif.created_at)} · {parseServerDate(notif.created_at)?.toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
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