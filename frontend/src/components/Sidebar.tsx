'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
  name: string;
  href: string;
}

const adminNavItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Monitoring Kartu Pass', href: '/pass' },
  { name: 'Laporan', href: '/reports' },
  { name: 'Master data', href: '/master' },
  { name: 'Pengaturan', href: '/settings' },
];

const receptionistNavItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Penerimaan Tamu', href: '/checkin' },
  { name: 'Pengembalian Akses', href: '/checkout' },
  { name: 'Kontrol Pass Aktif', href: '/pass' },
  { name: 'Laporan', href: '/reports' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isAdmin = user?.role_code === 'ADMIN';
  const navItems = isAdmin ? adminNavItems : receptionistNavItems;

  return (
    <aside className="w-64 bg-[#8A001A] text-white flex flex-col justify-start shrink-0 border-r border-black/40 pt-8 pb-6 px-4">
      <nav className="flex flex-col space-y-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href === '/reports' && pathname.startsWith('/reports')) ||
            (item.href === '/pass' && pathname.startsWith('/pass')) ||
            (item.href === '/checkin' && pathname.startsWith('/checkin')) ||
            (item.href === '/checkout' && pathname.startsWith('/checkout')) ||
            (item.href === '/master' && pathname.startsWith('/master')) ||
            (item.href === '/settings' && (pathname.startsWith('/settings') || pathname.startsWith('/profile'))) ||
            (item.href === '/dashboard' && pathname === '/dashboard');

          return (
            <Link
              key={item.name + item.href}
              href={item.href}
              className={`block w-full py-2.5 px-4 text-sm font-bold text-center transition-all ${
                isActive
                  ? 'bg-black text-white rounded-full shadow-md scale-102'
                  : 'text-white hover:bg-white/10 rounded-full'
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
