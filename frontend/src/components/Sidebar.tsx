'use client';

import React from 'react';
import Link from 'next/navigation';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard,
  UserPlus,
  CreditCard,
  LogOut as CheckOutIcon,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { name: 'Beranda & Registrasi', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Monitoring Rak Pass', href: '/pass', icon: CreditCard },
  { name: 'Check-Out Tamu', href: '/checkout', icon: CheckOutIcon },
  { name: 'Laporan & Riwayat', href: '/reports', icon: FileSpreadsheet },
  { name: 'Pengaturan Sistem', href: '/settings', icon: Settings, adminOnly: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isAdmin = user?.role_code === 'ADMIN';

  return (
    <aside className="w-64 bg-brand-950 text-white flex flex-col justify-between shrink-0 shadow-lg border-r border-brand-900">
      <div className="py-4">
        <div className="px-5 mb-4 text-[11px] font-semibold text-brand-200/60 uppercase tracking-wider">
          Menu Utama
        </div>
        <nav className="space-y-1 px-3">
          {navItems.map((item) => {
            if (item.adminOnly && !isAdmin) return null;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center px-4 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-brand-500 text-white shadow-sm font-semibold'
                    : 'text-white/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon
                  className={`w-4 h-4 mr-3 shrink-0 transition-colors ${
                    isActive ? 'text-white' : 'text-white/60 group-hover:text-white'
                  }`}
                />
                <span>{item.name}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                )}
              </a>
            );
          })}
        </nav>
      </div>

      {/* Footer Info in Sidebar */}
      <div className="p-4 mx-3 mb-4 rounded-xl bg-black/25 border border-white/5 text-[11px] text-white/70 space-y-1">
        <div className="flex items-center space-x-1.5 text-amber-300 font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Sistem Terverifikasi</span>
        </div>
        <p className="text-[10px] text-white/50 leading-tight">
          Status Pass: Real-time Concurrency Safe
        </p>
      </div>
    </aside>
  );
}
