'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Clock, User as UserIcon, LogOut, Bell, Check, UserCheck, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';

export default function Topbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [timeStr, setTimeStr] = useState<string>('');
  const [institutionName, setInstitutionName] = useState<string>('seamolec');
  const [logoUrl, setLogoUrl] = useState<string>('/seamolec-logo.jpg');
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
          setLogoUrl(res.data.data.logo_url);
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
        setLogoUrl(e.detail.logo_url);
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

  return (
    <header className="h-16 bg-[#8A001A] text-white flex items-center justify-between px-6 shadow-md border-b border-black/40 z-30 shrink-0">
      <div className="flex items-center space-x-3 cursor-pointer" onClick={() => router.push('/dashboard')}>
        <img
          src={logoUrl}
          alt={`${institutionName} Logo`}
          onError={() => setLogoUrl('/seamolec-logo.jpg')}
          className="w-10 h-10 rounded-full object-contain bg-white p-0.5 shadow-sm"
        />
        <span className="text-2xl font-bold tracking-tight text-white font-sans lowercase select-none">
          {institutionName}
        </span>
      </div>

      <div className="flex items-center space-x-4">
        <div className="hidden sm:flex items-center space-x-2 bg-white text-gray-800 text-xs px-4 py-1.5 rounded-full shadow-inner border border-gray-300 font-medium">
          <Clock className="w-3.5 h-3.5 text-gray-600 shrink-0" />
          <span>{timeStr || 'Selasa, 10 Nov 2026 · 14:30'}</span>
        </div>

        {/* In-app Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            title="Notifikasi Sistem"
            className="relative p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <Bell className="w-5 h-5" />
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
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-[#8A001A] hover:underline flex items-center space-x-1 font-medium"
                  >
                    <Check className="w-3 h-3" />
                    <span>Tandai semua dibaca</span>
                  </button>
                )}
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
                          {new Date(notif.created_at).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })} · {new Date(notif.created_at).toLocaleDateString('id-ID', {
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
