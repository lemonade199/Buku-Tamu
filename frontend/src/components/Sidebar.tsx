'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
  name: string;
  href: string;
  permission?: string;
  // Rute lain yang tetap menandai menu ini sebagai aktif.
  alsoActiveOn?: string[];
}

const navItemsList: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', permission: 'dashboard.read' },
  { name: 'Penerimaan Tamu', href: '/checkin', permission: 'visitors.create' },
  { name: 'Pengembalian Akses', href: '/checkout', permission: 'visitors.checkout' },
  { name: 'Monitoring Kartu Pass', href: '/pass', permission: 'pass.read' },
  { name: 'Laporan', href: '/reports', permission: 'reports.read' },
  { name: 'Master Data', href: '/master', permission: 'master.manage' },
  { name: 'Pengaturan', href: '/settings', permission: 'settings.manage', alsoActiveOn: ['/profile'] },
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

  const userPerms = user?.permissions || [];
  const hasWildcard = userPerms.includes('*');
  const hasPermission = (perm?: string) => {
    if (!perm) return true;
    if (hasWildcard) return true;
    return userPerms.includes(perm);
  };

  const navItems = navItemsList
    .filter((item) => hasPermission(item.permission))
    // Resepsionis melihat rak kartu di /pass, jadi menunya bernama "Kartu Pass".
    .map((item) => (item.href === '/pass' && !isAdmin ? { ...item, name: 'Kartu Pass' } : item));

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
