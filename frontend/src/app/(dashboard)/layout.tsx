'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import Topbar from '@/components/Topbar';
import Sidebar from '@/components/Sidebar';
import { Plus_Jakarta_Sans } from 'next/font/google';

// Huruf khusus area dashboard: dirancang di Jakarta, angkanya jelas untuk tabel dan nomor pass.
// Sengaja tidak dipasang global supaya halaman form tamu dan login tetap seperti sekarang.
const dashboardFont = Plus_Jakarta_Sans({ subsets: ['latin'], display: 'swap' });

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const openMenu = useCallback(() => setMenuOpen(true), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const checkMe = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        await api.get('/auth/me');
      } catch (err: any) {
        if (err.response?.status === 401) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user_info');
          router.push('/login?reason=inactive');
        }
      }
    };

    const checkActiveInterval = setInterval(checkMe, 8000);
    const onVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        checkMe();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Idle session timeout based on settings
    let sessionTimeoutHours = 8;
    api.get('/settings/public')
      .then((res) => {
        if (res.data?.success && res.data?.data?.session_timeout_hours) {
          sessionTimeoutHours = Number(res.data.data.session_timeout_hours) || 8;
        }
      })
      .catch(() => {});

    let lastActivityTime = Date.now();
    const handleUserActivity = () => {
      lastActivityTime = Date.now();
    };

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach((ev) => window.addEventListener(ev, handleUserActivity, { passive: true }));

    const idleTimer = setInterval(() => {
      const elapsedMs = Date.now() - lastActivityTime;
      const maxIdleMs = sessionTimeoutHours * 3600 * 1000;
      if (elapsedMs > maxIdleMs) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_info');
        router.push('/login?reason=session_timeout');
      }
    }, 15000);

    return () => {
      clearInterval(checkActiveInterval);
      clearInterval(idleTimer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      activityEvents.forEach((ev) => window.removeEventListener(ev, handleUserActivity));
    };
  }, [isAuthenticated, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F0]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#8A001A] border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
          <p className="text-xs font-medium text-gray-600">Memuat sesi pengguna...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className={`${dashboardFont.className} h-screen flex flex-col bg-[#FAF7F0]`}>
      <Topbar onOpenMenu={openMenu} />
      <div className="flex flex-1 min-h-0">
        <Sidebar open={menuOpen} onClose={closeMenu} />
        <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#FAF7F0]">
          {children}
        </main>
      </div>
    </div>
  );
}
