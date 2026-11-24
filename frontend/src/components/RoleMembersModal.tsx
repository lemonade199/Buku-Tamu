'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, UserPlus, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

export interface RoleOption {
  id_role: number;
  code: string;
  label: string;
}

interface UserRow {
  id_user: number;
  fullname: string;
  username: string;
  email: string;
  telephone?: string | null;
  role_code: string | null;
  is_active: boolean;
}

interface RoleMembersModalProps {
  role: RoleOption;
  roles: RoleOption[];
  onClose: () => void;
  // Dipanggil setelah ada perubahan, supaya jumlah pengguna, matriks, dan riwayat ikut diperbarui.
  onChanged: (message: string) => void;
}

const inputClass =
  'w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30 focus:border-[#8A001A]';

export default function RoleMembersModal({ role, roles, onClose, onChanged }: RoleMembersModalProps) {
  const { user: currentUser } = useAuth();
  const [members, setMembers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [moveTargets, setMoveTargets] = useState<Record<number, string>>({});
  const [movingId, setMovingId] = useState<number | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState({ fullname: '', username: '', email: '', password: '' });
  const [adding, setAdding] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: UserRow[] }>('/auth/users');
      setMembers((res.data.data || []).filter((u) => u.role_code === role.code));
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Daftar pengguna belum bisa dimuat.');
    } finally {
      setLoading(false);
    }
  }, [role.code]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const otherRoles = roles.filter((r) => r.code !== role.code);

  const handleMove = async (member: UserRow) => {
    const targetCode = moveTargets[member.id_user];
    const target = roles.find((r) => r.code === targetCode);
    if (!target) return;
    if (!window.confirm(`Pindahkan ${member.fullname} dari ${role.label} ke ${target.label}?`)) return;

    setMovingId(member.id_user);
    setError('');
    try {
      await api.put(`/auth/users/${member.id_user}`, {
        fullname: member.fullname,
        username: member.username,
        email: member.email,
        telephone: member.telephone || '',
        role_code: target.code,
      });
      onChanged(`${member.fullname} dipindahkan ke role ${target.label}.`);
      fetchMembers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal memindahkan role pengguna.');
    } finally {
      setMovingId(null);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setError('');
    try {
      await api.post('/auth/users', { ...newUser, role_code: role.code });
      onChanged(`Akun ${newUser.fullname} ditambahkan ke role ${role.label}.`);
      setNewUser({ fullname: '', username: '', email: '', password: '' });
      setShowAddForm(false);
      fetchMembers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal menambahkan pengguna.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-members-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-white rounded-2xl shadow-2xl focus:outline-none"
      >
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-200">
          <div>
            <h2 id="role-members-title" className="text-base font-semibold text-[#3B0A11]">
              Pengguna dengan role {role.label}
            </h2>
            <p className="text-xs text-gray-600 mt-0.5">{loading ? 'Memuat…' : `${members.length} akun`}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="p-1.5 rounded-full text-gray-500 hover:text-gray-800 hover:bg-gray-100 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A001A]"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {error && (
            <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <p className="py-8 text-center text-xs text-gray-500">Memuat daftar pengguna…</p>
          ) : members.length === 0 ? (
            <p className="py-8 text-center text-xs text-gray-500">Belum ada pengguna dengan role ini.</p>
          ) : (
            <ul className="divide-y divide-gray-100 border border-gray-200 rounded-xl">
              {members.map((m) => {
                const isSelf = currentUser?.id_user === m.id_user;
                return (
                  <li key={m.id_user} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {m.fullname}
                        {isSelf && <span className="ml-1.5 text-[11px] font-medium text-gray-500">(Anda)</span>}
                      </p>
                      <p className="text-xs text-gray-600 truncate">
                        @{m.username}
                        {!m.is_active && <span className="ml-2 text-[11px] font-semibold text-gray-500">Nonaktif</span>}
                      </p>
                    </div>

                    {isSelf ? (
                      <p className="text-[11px] text-gray-500 sm:max-w-[220px]">
                        Role akun sendiri tidak bisa diubah, supaya Anda tidak terkunci.
                      </p>
                    ) : otherRoles.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <label htmlFor={`move-${m.id_user}`} className="sr-only">
                          Pindahkan {m.fullname} ke role
                        </label>
                        <select
                          id={`move-${m.id_user}`}
                          value={moveTargets[m.id_user] || ''}
                          onChange={(e) => setMoveTargets({ ...moveTargets, [m.id_user]: e.target.value })}
                          className="bg-white border border-gray-300 rounded-full px-3 py-1.5 text-xs text-gray-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30 focus:border-[#8A001A]"
                        >
                          <option value="">Pindahkan ke…</option>
                          {otherRoles.map((r) => (
                            <option key={r.code} value={r.code}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleMove(m)}
                          disabled={!moveTargets[m.id_user] || movingId === m.id_user}
                          className="px-3 py-1.5 bg-[#8A001A] hover:bg-[#700015] active:bg-[#5A0011] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-full transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#8A001A]"
                        >
                          {movingId === m.id_user ? 'Memindahkan…' : 'Pindahkan'}
                        </button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}

          {showAddForm ? (
            <form onSubmit={handleAdd} className="border border-gray-200 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-[#3B0A11]">Tambah pengguna ke role {role.label}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="new-fullname" className="block text-xs font-semibold text-gray-700 mb-1">Nama lengkap</label>
                  <input id="new-fullname" required value={newUser.fullname} onChange={(e) => setNewUser({ ...newUser, fullname: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="new-username" className="block text-xs font-semibold text-gray-700 mb-1">Username</label>
                  <input id="new-username" required value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="new-email" className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                  <input id="new-email" type="email" required value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="new-password" className="block text-xs font-semibold text-gray-700 mb-1">Kata sandi awal</label>
                  <input id="new-password" type="password" required minLength={8} autoComplete="new-password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="px-4 py-1.5 bg-[#8A001A] hover:bg-[#700015] active:bg-[#5A0011] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#8A001A]"
                >
                  {adding ? 'Menyimpan…' : 'Tambah pengguna'}
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-dashed border-gray-400 hover:border-[#8A001A] hover:text-[#8A001A] text-gray-700 text-xs font-semibold rounded-full cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A001A]"
            >
              <UserPlus className="w-4 h-4" aria-hidden="true" />
              <span>Tambah pengguna ke role ini</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
