'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Search, User as UserIcon, LogOut, Bell } from 'lucide-react';

export default function Topbar() {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-brand-500 text-white flex items-center justify-between px-6 shadow-md z-20">
      {/* Brand & Institution Info */}
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center font-bold text-lg border border-white/20">
          BT
        </div>
        <div>
          <h1 className="text-sm font-semibold tracking-wide leading-tight">BUKU TAMU DIGITAL</h1>
          <p className="text-xs text-white/75">Kantor Pelayanan Terpadu</p>
        </div>
      </div>

      {/* Global Quick Search */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-charcoal-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nomor pass (misal: 01), nama pengunjung, telepon..."
            className="w-full bg-white text-charcoal text-xs rounded-full pl-9 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-200 placeholder:text-charcoal-muted/70 shadow-inner"
          />
        </div>
      </div>

      {/* User Session & Actions */}
      <div className="flex items-center space-x-4">
        <button 
          title="Notifikasi"
          className="p-2 rounded-full hover:bg-white/10 text-white/90 transition-colors relative"
        >
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-amber-400 absolute top-1.5 right-1.5 ring-2 ring-brand-500" />
        </button>

        <div className="h-6 w-px bg-white/20" />

        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-white border border-white/25">
            <UserIcon className="w-4 h-4" />
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-medium leading-none">{user?.fullname || 'Petugas'}</p>
            <span className="inline-block mt-0.5 text-[10px] uppercase font-semibold tracking-wider text-amber-300">
              {user?.role_name || user?.role_code || 'PETUGAS'}
            </span>
          </div>
          <button
            onClick={() => logout()}
            title="Keluar / Logout"
            className="p-2 ml-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
