'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
  name: string;
  href: string;
  // Rute lain yang tetap menandai menu ini sebagai aktif.
  alsoActiveOn?: string[];
}

const adminNavItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Monitoring Kartu Pass', href: '/pass' },
  { name: 'Laporan', href: '/reports' },
  { name: 'Master Data', href: '/master' },
  { name: 'Pengaturan', href: '/settings', alsoActiveOn: ['/profile'] },
];

const receptionistNavItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Penerimaan Tamu', href: '/checkin' },
  { name: 'Pengembalian Akses', href: '/checkout' },
  { name: 'Kontrol Pass Aktif', href: '/pass' },
  { name: 'Laporan', href: '/reports' },
];

function isItemActive(item: NavItem, pathname: string) {
  return [item.href, ...(item.alsoActiveOn ?? [])].some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const isAdmin = user?.role_code === 'ADMIN';
  const navItems = isAdmin ? adminNavItems : receptionistNavItems;

  // Menu di layar kecil menutup sendiri saat pindah halaman.
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={onClose} aria-hidden="true" />
      )}

      <aside
        id="dashboard-sidebar"
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#8A001A] text-white flex flex-col shrink-0 border-r border-black/30 transition-transform duration-200 motion-reduce:transition-none md:static md:z-auto md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 pt-5 md:hidden">
          <span className="text-sm font-semibold text-white/80">Menu</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup menu"
            className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 active:bg-white/20 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Menu utama" className="flex-1 overflow-y-auto px-3 pt-6 pb-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const active = isItemActive(item, pathname);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`block rounded-xl px-4 py-2.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                      active
                        ? 'bg-[#3E2723] text-white font-semibold'
                        : 'text-white/85 font-medium hover:bg-white/10 hover:text-white active:bg-white/15'
                    }`}
                  >
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-white/15 px-3 py-4">
          <button
            type="button"
            onClick={() => logout()}
            className="w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white active:bg-white/15 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>
    </>
  );
}
