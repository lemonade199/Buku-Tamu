import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Sidebar from './Sidebar';

const authState: { user: { role_code: string; permissions: string[] } | null } = { user: null };

vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard' }));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: authState.user, logout: vi.fn() }),
}));

function menuNames() {
  return screen.getAllByRole('link').map((a) => a.textContent);
}

describe('Sidebar', () => {
  beforeEach(() => {
    authState.user = null;
  });

  it('hanya menampilkan menu yang izinnya dimiliki', () => {
    authState.user = { role_code: 'PETUGAS', permissions: ['dashboard.read', 'visitors.create', 'pass.read'] };
    render(<Sidebar open={false} onClose={() => {}} />);
    expect(menuNames()).toEqual(['Dashboard', 'Penerimaan Tamu', 'Kartu Pass']);
  });

  it('admin melihat nama "Monitoring Kartu Pass"', () => {
    authState.user = { role_code: 'ADMIN', permissions: ['pass.read', 'settings.manage'] };
    render(<Sidebar open={false} onClose={() => {}} />);
    expect(menuNames()).toEqual(['Monitoring Kartu Pass', 'Pengaturan']);
  });

  it('izin * membuka semua menu', () => {
    authState.user = { role_code: 'ADMIN', permissions: ['*'] };
    render(<Sidebar open={false} onClose={() => {}} />);
    expect(menuNames()).toHaveLength(7);
  });

  it('menu yang sedang dibuka ditandai aktif', () => {
    authState.user = { role_code: 'ADMIN', permissions: ['*'] };
    render(<Sidebar open={false} onClose={() => {}} />);
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Laporan' })).not.toHaveAttribute('aria-current');
  });
});
