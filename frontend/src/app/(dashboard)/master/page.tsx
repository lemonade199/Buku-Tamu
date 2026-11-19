'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import {
  Search,
  ChevronDown,
  X,
  Plus,
  ShieldAlert,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  User as UserIcon,
  KeyRound,
  Camera,
  Copy,
  Check,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PassItem {
  id_pass: number;
  no_pass: string;
  slot?: string;
  status: string;
}

interface UserItem {
  id_user: number;
  fullname: string;
  username: string;
  email: string;
  role_code: string;
  role_name: string;
  telephone?: string;
  avatar?: string | null;
  is_active: boolean;
  last_login_at?: string;
}

export default function MasterDataPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

  const [activeTab, setActiveTab] = useState<'pass' | 'user'>('user');
  const [passes, setPasses] = useState<PassItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [conditionFilter, setConditionFilter] = useState('Semua kondisi');
  const [conditionFilterOpen, setConditionFilterOpen] = useState(false);

  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('Semua peran');
  const [userRoleFilterOpen, setUserRoleFilterOpen] = useState(false);

  const [editingPass, setEditingPass] = useState<PassItem | null>(null);
  const [editNomor, setEditNomor] = useState('');
  const [editSlot, setEditSlot] = useState('');
  const [editKondisi, setEditKondisi] = useState('Baik');
  const [editIsActive, setEditIsActive] = useState(true);
  const [savingPass, setSavingPass] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addNomor, setAddNomor] = useState('');
  const [addSlot, setAddSlot] = useState('');
  const [addingPass, setAddingPass] = useState(false);

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [addUserForm, setAddUserForm] = useState({
    fullname: '',
    username: '',
    email: '',
    telephone: '',
    role_code: 'PETUGAS',
    password: '',
    avatar: '',
  });
  const [addUserAvatarPreview, setAddUserAvatarPreview] = useState<string | null>(null);
  const [addingUser, setAddingUser] = useState(false);
  const addFileInputRef = useRef<HTMLInputElement>(null);

  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editUserForm, setEditUserForm] = useState({
    fullname: '',
    username: '',
    email: '',
    telephone: '',
    role_code: 'PETUGAS',
    is_active: true,
    avatar: '',
  });
  const [editUserAvatarPreview, setEditUserAvatarPreview] = useState<string | null>(null);
  const [savingUser, setSavingUser] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const [resetPasswordUser, setResetPasswordUser] = useState<UserItem | null>(null);
  const [newResetPassword, setNewResetPassword] = useState('123456');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [passRes, userRes] = await Promise.all([
        api.get<{ success: boolean; data: PassItem[] }>('/pass').catch(() => ({ data: { data: [] } })),
        api.get<{ success: boolean; data: UserItem[] }>('/auth/users').catch(() => ({ data: { data: [] } })),
      ]);

      setPasses(passRes.data.data || []);
      setUsers(userRes.data.data || []);
    } catch {
      setFeedback({ type: 'error', text: 'Gagal memuat data master.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!authLoading && user && user.role_code !== 'ADMIN') {
    return (
      <div className="max-w-md mx-auto mt-12 p-6 bg-white rounded-2xl border border-rose-200 shadow-sm text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-gray-900">Akses Terbatas</h2>
        <p className="text-xs text-gray-600 leading-relaxed">
          Halaman Master Data hanya dapat diakses oleh Administrator Sistem.
        </p>
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#8A001A] text-white text-xs font-semibold rounded-xl hover:bg-[#700015] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Dashboard</span>
        </button>
      </div>
    );
  }

  const openEditModal = (p: PassItem) => {
    setEditingPass(p);
    const num = (p.no_pass || String(p.id_pass)).padStart(2, '0');
    setEditNomor(num);
    setEditSlot(p.slot || `Slot ${num}`);

    if (p.status === 'MAINTENANCE') {
      setEditKondisi('Perlu Perbaikan');
      setEditIsActive(true);
    } else if (p.status === 'LOST') {
      setEditKondisi('Hilang');
      setEditIsActive(false);
    } else if (p.status === 'INACTIVE') {
      setEditKondisi('Baik');
      setEditIsActive(false);
    } else {
      setEditKondisi('Baik');
      setEditIsActive(true);
    }
  };

  const handleSavePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPass) return;

    setSavingPass(true);
    setFeedback(null);
    try {
      const res = await api.put(`/pass/${editingPass.id_pass}`, {
        no_pass: editNomor.trim(),
        slot: editSlot.trim(),
        kondisi: editKondisi,
        is_active: editIsActive,
      });

      setFeedback({ type: 'success', text: res.data.message || 'Data kartu pass berhasil diperbarui.' });
      setEditingPass(null);
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal memperbarui kartu pass.';
      setFeedback({ type: 'error', text: msg });
    } finally {
      setSavingPass(false);
    }
  };

  const handleTogglePassActive = async (p: PassItem) => {
    const isCurrentlyActive = p.status !== 'INACTIVE';
    const newActiveState = !isCurrentlyActive;

    try {
      await api.put(`/pass/${p.id_pass}`, {
        no_pass: p.no_pass,
        slot: p.slot,
        is_active: newActiveState,
        kondisi: p.status === 'MAINTENANCE' ? 'Perlu Perbaikan' : p.status === 'LOST' ? 'Hilang' : 'Baik',
      });
      fetchData();
    } catch {
      setFeedback({ type: 'error', text: 'Gagal mengubah status aktif kartu pass.' });
    }
  };

  const handleAddPass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addNomor.trim()) return;

    setAddingPass(true);
    setFeedback(null);
    try {
      const res = await api.post('/pass', {
        no_pass: addNomor.trim(),
        slot: addSlot.trim() || `Slot ${addNomor.trim()}`,
      });

      setFeedback({ type: 'success', text: res.data.message || 'Kartu pass berhasil ditambahkan.' });
      setShowAddModal(false);
      setAddNomor('');
      setAddSlot('');
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal menambahkan kartu pass.';
      setFeedback({ type: 'error', text: msg });
    } finally {
      setAddingPass(false);
    }
  };

  const openEditUserModal = (u: UserItem) => {
    setEditingUser(u);
    setEditUserForm({
      fullname: u.fullname,
      username: u.username,
      email: u.email,
      telephone: u.telephone || '',
      role_code: u.role_code || 'PETUGAS',
      is_active: u.is_active,
      avatar: '',
    });
    if (u.avatar) {
      setEditUserAvatarPreview(`${apiBaseUrl}/auth/users/${u.id_user}/avatar`);
    } else {
      setEditUserAvatarPreview(null);
    }
  };

  const handleEditUserAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const b64 = reader.result as string;
        setEditUserAvatarPreview(b64);
        setEditUserForm((prev) => ({ ...prev, avatar: b64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddUserAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const b64 = reader.result as string;
        setAddUserAvatarPreview(b64);
        setAddUserForm((prev) => ({ ...prev, avatar: b64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setSavingUser(true);
    setFeedback(null);
    try {
      const payload: any = {
        fullname: editUserForm.fullname.trim(),
        username: editUserForm.username.trim(),
        email: editUserForm.email.trim(),
        telephone: editUserForm.telephone.trim(),
        role_code: editUserForm.role_code,
        is_active: editUserForm.is_active,
      };
      if (editUserForm.avatar) {
        payload.avatar = editUserForm.avatar;
      }

      const res = await api.put(`/auth/users/${editingUser.id_user}`, payload);

      setFeedback({ type: 'success', text: res.data.message || 'Data pengguna berhasil diperbarui.' });
      setEditingUser(null);
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal memperbarui pengguna.';
      setFeedback({ type: 'error', text: msg });
    } finally {
      setSavingUser(false);
    }
  };

  const handleToggleUserActive = async (u: UserItem) => {
    try {
      const res = await api.patch(`/auth/users/${u.id_user}/toggle-active`);
      setFeedback({ type: 'success', text: res.data.message || 'Status pengguna berhasil diubah.' });
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal mengubah status aktif pengguna.';
      setFeedback({ type: 'error', text: msg });
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUserForm.fullname.trim() || !addUserForm.username.trim() || !addUserForm.email.trim()) return;

    setAddingUser(true);
    setFeedback(null);
    try {
      const payload: any = {
        fullname: addUserForm.fullname.trim(),
        username: addUserForm.username.trim(),
        email: addUserForm.email.trim(),
        telephone: addUserForm.telephone.trim(),
        role_code: addUserForm.role_code,
        password: addUserForm.password.trim() || '123456',
      };
      if (addUserForm.avatar) {
        payload.avatar = addUserForm.avatar;
      }

      const res = await api.post('/auth/users', payload);

      setFeedback({ type: 'success', text: res.data.message || 'Pengguna berhasil ditambahkan.' });
      setShowAddUserModal(false);
      setAddUserForm({
        fullname: '',
        username: '',
        email: '',
        telephone: '',
        role_code: 'PETUGAS',
        password: '',
        avatar: '',
      });
      setAddUserAvatarPreview(null);
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal menambahkan pengguna.';
      setFeedback({ type: 'error', text: msg });
    } finally {
      setAddingUser(false);
    }
  };

  const openResetPasswordModal = (u: UserItem) => {
    setResetPasswordUser(u);
    setNewResetPassword('123456');
    setCopiedPassword(false);
  };

  const handleCopyPassword = () => {
    if (!newResetPassword) return;
    navigator.clipboard.writeText(newResetPassword);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser) return;

    setResettingPassword(true);
    setFeedback(null);
    try {
      const res = await api.post(`/auth/users/${resetPasswordUser.id_user}/reset-password`, {
        password: newResetPassword.trim() || '123456',
      });

      setFeedback({
        type: 'success',
        text: res.data.message || `Password untuk ${resetPasswordUser.fullname} berhasil diatur ke "${newResetPassword}".`,
      });
      setResetPasswordUser(null);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal mereset password.';
      setFeedback({ type: 'error', text: msg });
    } finally {
      setResettingPassword(false);
    }
  };

  const formatLastLogin = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '-';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month} · ${hours}.${mins}`;
    } catch {
      return '-';
    }
  };

  const filteredPasses = passes.filter((p) => {
    const term = searchTerm.toLowerCase().trim();
    const formattedPass = (p.no_pass || String(p.id_pass)).padStart(2, '0');
    const slotStr = (p.slot || `Slot ${formattedPass}`).toLowerCase();

    const matchesSearch = !term || formattedPass.includes(term) || slotStr.includes(term);

    let kondisiLabel = 'Baik';
    if (p.status === 'MAINTENANCE') kondisiLabel = 'Perlu Perbaikan';
    if (p.status === 'LOST') kondisiLabel = 'Hilang';

    const matchesCondition =
      conditionFilter === 'Semua kondisi' || kondisiLabel === conditionFilter;

    return matchesSearch && matchesCondition;
  });

  const filteredUsers = users
    .filter((u) => !['admin', 'petugas'].includes(u.username.toLowerCase()))
    .filter((u) => {
      const term = userSearchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        u.fullname.toLowerCase().includes(term) ||
        u.username.toLowerCase().includes(term);

      const roleDisplay = u.role_code === 'ADMIN' ? 'Admin' : 'Resepsionis';
      const matchesRole =
        userRoleFilter === 'Semua peran' || roleDisplay === userRoleFilter;

      return matchesSearch && matchesRole;
    });

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-black text-[#1A1A1A] tracking-tight">
          Master Data
        </h1>
      </div>

      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-2xs ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-rose-50 text-rose-800 border-rose-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-gray-400 hover:text-gray-700 cursor-pointer p-1"
            aria-label="Tutup notifikasi"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={() => setActiveTab('pass')}
          className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'pass'
              ? 'bg-black text-white shadow-md'
              : 'bg-white border-2 border-black text-gray-800 hover:bg-gray-100'
          }`}
        >
          Data Pass
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('user')}
          className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'user'
              ? 'bg-black text-white shadow-md'
              : 'bg-white border-2 border-black text-gray-800 hover:bg-gray-100'
          }`}
        >
          Data Pengguna
        </button>
      </div>

      {activeTab === 'pass' ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari no. pass"
                  aria-label="Cari nomor pass"
                  className="w-full bg-white border-2 border-black rounded-full pl-11 pr-4 py-1.5 text-xs text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30 shadow-xs font-medium"
                />
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setConditionFilterOpen(!conditionFilterOpen)}
                  className="inline-flex items-center space-x-2 bg-white border-2 border-black rounded-full px-4 py-1.5 text-xs font-semibold text-gray-800 shadow-xs hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <span>{conditionFilter}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-700 ml-1" />
                </button>

                {conditionFilterOpen && (
                  <div className="absolute left-0 mt-2 py-1 bg-white border border-gray-300 rounded-2xl shadow-xl z-20 w-44 text-xs">
                    {['Semua kondisi', 'Baik', 'Perlu Perbaikan', 'Hilang'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setConditionFilter(c);
                          setConditionFilterOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 font-medium text-gray-800 cursor-pointer"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(true);
                  const nextNo = String(passes.length + 1).padStart(2, '0');
                  setAddNomor(nextNo);
                  setAddSlot(`Slot ${nextNo}`);
                }}
                className="inline-flex items-center space-x-1.5 px-4 py-1.5 bg-[#6B0014] hover:bg-[#52000F] text-white text-xs font-bold rounded-full shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Tambah pass</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-400">
                  <th scope="col" className="py-2.5 px-3 text-sm font-bold italic underline text-[#4A000E]">No. pass</th>
                  <th scope="col" className="py-2.5 px-3 text-sm font-bold italic underline text-[#4A000E]">Slot KTP</th>
                  <th scope="col" className="py-2.5 px-3 text-sm font-bold italic underline text-[#4A000E] text-center">Kondisi</th>
                  <th scope="col" className="py-2.5 px-3 text-sm font-bold italic underline text-[#4A000E] text-center">Aktif</th>
                  <th scope="col" className="py-2.5 px-3 text-sm font-bold italic underline text-[#4A000E] text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300/80 text-xs text-gray-800">
                {loading && passes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-500 font-medium">
                      <div className="w-6 h-6 border-2 border-[#8A001A] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <span>Memuat data master pass...</span>
                    </td>
                  </tr>
                ) : filteredPasses.length > 0 ? (
                  filteredPasses.map((p) => {
                    const formattedPass = (p.no_pass || String(p.id_pass)).padStart(2, '0');
                    const slotDisplay = p.slot || `Slot ${formattedPass}`;
                    const isActive = p.status !== 'INACTIVE';

                    let kondisiBadge = (
                      <span className="inline-block px-4 py-0.5 bg-[#1E5631] text-white text-[11px] font-bold rounded-full min-w-[70px] text-center shadow-2xs">
                        Baik
                      </span>
                    );
                    if (p.status === 'MAINTENANCE') {
                      kondisiBadge = (
                        <span className="inline-block px-4 py-0.5 bg-[#D97706] text-white text-[11px] font-bold rounded-full min-w-[70px] text-center shadow-2xs">
                          Perlu Perbaikan
                        </span>
                      );
                    } else if (p.status === 'LOST') {
                      kondisiBadge = (
                        <span className="inline-block px-4 py-0.5 bg-[#BE123C] text-white text-[11px] font-bold rounded-full min-w-[70px] text-center shadow-2xs">
                          Hilang
                        </span>
                      );
                    }

                    return (
                      <tr key={p.id_pass} className="hover:bg-black/5 transition-colors">
                        <td className="py-3 px-3">
                          <span className="inline-block bg-[#4A000E] text-white font-extrabold text-xs px-3.5 py-0.5 rounded-full shadow-2xs min-w-[36px] text-center">
                            {formattedPass}
                          </span>
                        </td>

                        <td className="py-3 px-3 font-semibold text-gray-900 whitespace-nowrap">
                          {slotDisplay}
                        </td>

                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {kondisiBadge}
                        </td>

                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleTogglePassActive(p)}
                            title={isActive ? 'Nonaktifkan kartu pass' : 'Aktifkan kartu pass'}
                            className={`w-9 h-5 rounded-full transition-colors relative inline-flex items-center cursor-pointer p-0.5 ${
                              isActive ? 'bg-[#1E5631]' : 'bg-gray-300'
                            }`}
                          >
                            <span
                              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                isActive ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </td>

                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openEditModal(p)}
                            className="px-4 py-1 bg-[#5B6367] hover:bg-[#484F52] text-white text-xs font-bold rounded-full shadow-xs transition-colors cursor-pointer"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-500 font-medium">
                      Tidak ada data kartu pass yang cocok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  placeholder="Cari nama / username"
                  aria-label="Cari nama atau username"
                  className="w-full bg-white border-2 border-black rounded-full pl-11 pr-4 py-1.5 text-xs text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30 shadow-xs font-medium"
                />
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserRoleFilterOpen(!userRoleFilterOpen)}
                  className="inline-flex items-center space-x-2 bg-white border-2 border-black rounded-full px-4 py-1.5 text-xs font-semibold text-gray-800 shadow-xs hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <span>{userRoleFilter}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-700 ml-1" />
                </button>

                {userRoleFilterOpen && (
                  <div className="absolute left-0 mt-2 py-1 bg-white border border-gray-300 rounded-2xl shadow-xl z-20 w-44 text-xs">
                    {['Semua peran', 'Admin', 'Resepsionis'].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          setUserRoleFilter(r);
                          setUserRoleFilterOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 font-medium text-gray-800 cursor-pointer"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => {
                  setShowAddUserModal(true);
                  setAddUserForm({
                    fullname: '',
                    username: '',
                    email: '',
                    telephone: '',
                    role_code: 'PETUGAS',
                    password: '123456',
                    avatar: '',
                  });
                  setAddUserAvatarPreview(null);
                }}
                className="inline-flex items-center space-x-1.5 px-4 py-1.5 bg-[#6B0014] hover:bg-[#52000F] text-white text-xs font-bold rounded-full shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Tambah pengguna</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-400">
                  <th scope="col" className="py-2.5 px-3 text-sm font-bold italic underline text-[#4A000E] w-14">Foto</th>
                  <th scope="col" className="py-2.5 px-3 text-sm font-bold italic underline text-[#4A000E]">Nama</th>
                  <th scope="col" className="py-2.5 px-3 text-sm font-bold italic underline text-[#4A000E]">Username</th>
                  <th scope="col" className="py-2.5 px-3 text-sm font-bold italic underline text-[#4A000E]">Peran</th>
                  <th scope="col" className="py-2.5 px-3 text-sm font-bold italic underline text-[#4A000E]">No. HP</th>
                  <th scope="col" className="py-2.5 px-3 text-sm font-bold italic underline text-[#4A000E]">Terakhir login</th>
                  <th scope="col" className="py-2.5 px-3 text-sm font-bold italic underline text-[#4A000E] text-center">Aktif</th>
                  <th scope="col" className="py-2.5 px-3 text-sm font-bold italic underline text-[#4A000E] text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300/80 text-xs text-gray-800">
                {loading && users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-500 font-medium">
                      <div className="w-6 h-6 border-2 border-[#8A001A] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <span>Memuat data pengguna...</span>
                    </td>
                  </tr>
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((u) => {
                    const roleIsAdmin = u.role_code === 'ADMIN';
                    const avatarUrl = u.avatar ? `${apiBaseUrl}/auth/users/${u.id_user}/avatar` : null;

                    return (
                      <tr key={u.id_user} className="hover:bg-black/5 transition-colors">
                        <td className="py-3 px-3">
                          <div className="w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center text-white overflow-hidden shadow-2xs border border-gray-300">
                            {avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt={u.fullname}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <UserIcon className="w-5 h-5 text-gray-500 fill-gray-500" />
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3 font-semibold text-gray-900 whitespace-nowrap">
                          {u.fullname}
                        </td>

                        <td className="py-3 px-3 text-gray-800 whitespace-nowrap">
                          {u.username}
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`inline-block px-3.5 py-0.5 text-[11px] font-bold rounded-full min-w-[75px] text-center shadow-2xs text-white ${
                              roleIsAdmin ? 'bg-black' : 'bg-[#8A001A]'
                            }`}
                          >
                            {roleIsAdmin ? 'Admin' : 'Resepsionis'}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-gray-800 whitespace-nowrap font-medium">
                          {u.telephone || '-'}
                        </td>

                        <td className="py-3 px-3 text-gray-800 whitespace-nowrap font-medium">
                          {formatLastLogin(u.last_login_at)}
                        </td>

                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleToggleUserActive(u)}
                            title={u.is_active ? 'Nonaktifkan pengguna' : 'Aktifkan pengguna'}
                            className={`w-9 h-5 rounded-full transition-colors relative inline-flex items-center cursor-pointer p-0.5 ${
                              u.is_active ? 'bg-[#1E5631]' : 'bg-gray-300'
                            }`}
                          >
                            <span
                              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                u.is_active ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </td>

                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="inline-flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => openEditUserModal(u)}
                              className="px-3.5 py-1 bg-[#5B6367] hover:bg-[#484F52] text-white text-xs font-bold rounded-full shadow-xs transition-colors cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => openResetPasswordModal(u)}
                              className="px-3.5 py-1 bg-[#8A001A] hover:bg-[#700015] text-white text-xs font-bold rounded-full shadow-xs transition-colors cursor-pointer"
                            >
                              Reset password
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-500 font-medium">
                      Tidak ada data pengguna yang cocok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editingPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-200">
            <div className="bg-[#8A001A] text-white px-6 py-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-white tracking-wide">
                Edit Kartu
              </h3>
              <button
                type="button"
                onClick={() => setEditingPass(null)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Tutup modal edit kartu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePass} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#4A000E] mb-1.5">
                    Nomor
                  </label>
                  <input
                    type="text"
                    value={editNomor}
                    onChange={(e) => setEditNomor(e.target.value)}
                    required
                    className="w-full bg-white border-2 border-black rounded-full px-4 py-1.5 text-xs text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4A000E] mb-1.5">
                    Slot
                  </label>
                  <input
                    type="text"
                    value={editSlot}
                    onChange={(e) => setEditSlot(e.target.value)}
                    className="w-full bg-white border-2 border-black rounded-full px-4 py-1.5 text-xs text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-xs font-bold text-[#4A000E] mb-1.5">
                    Kondisi
                  </label>
                  <div className="relative">
                    <select
                      value={editKondisi}
                      onChange={(e) => setEditKondisi(e.target.value)}
                      className="w-full bg-white border-2 border-black rounded-full px-4 py-1.5 text-xs text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30 appearance-none cursor-pointer"
                    >
                      <option value="Baik">Baik</option>
                      <option value="Perlu Perbaikan">Perlu Perbaikan</option>
                      <option value="Hilang">Hilang</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-700 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4A000E] mb-1.5">
                    Status aktif
                  </label>
                  <div className="flex items-center space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditIsActive(!editIsActive)}
                      className={`w-9 h-5 rounded-full transition-colors relative inline-flex items-center cursor-pointer p-0.5 ${
                        editIsActive ? 'bg-[#1E5631]' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full bg-white transition-transform ${
                          editIsActive ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <span className="text-xs font-semibold text-gray-800">
                      {editIsActive ? 'Aktif (bisa dipinjamkan)' : 'Nonaktif (tidak bisa dipinjamkan)'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-b border-gray-200 pt-2" />

              <div className="flex items-center justify-end space-x-3 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingPass(null)}
                  className="px-6 py-1.5 bg-white border-2 border-black rounded-full text-xs font-bold text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingPass}
                  className="px-6 py-1.5 bg-[#8A001A] hover:bg-[#700015] disabled:opacity-50 rounded-full text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
                >
                  {savingPass ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-200">
            <div className="bg-[#8A001A] text-white px-6 py-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-white tracking-wide">
                Tambah Kartu Pass
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Tutup modal tambah kartu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddPass} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#4A000E] mb-1.5">
                    Nomor Pass
                  </label>
                  <input
                    type="text"
                    value={addNomor}
                    onChange={(e) => setAddNomor(e.target.value)}
                    required
                    placeholder="Contoh: 17"
                    className="w-full bg-white border-2 border-black rounded-full px-4 py-1.5 text-xs text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4A000E] mb-1.5">
                    Slot KTP
                  </label>
                  <input
                    type="text"
                    value={addSlot}
                    onChange={(e) => setAddSlot(e.target.value)}
                    placeholder="Contoh: Slot 17"
                    className="w-full bg-white border-2 border-black rounded-full px-4 py-1.5 text-xs text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30"
                  />
                </div>
              </div>

              <div className="border-b border-gray-200 pt-2" />

              <div className="flex items-center justify-end space-x-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-1.5 bg-white border-2 border-black rounded-full text-xs font-bold text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={addingPass}
                  className="px-6 py-1.5 bg-[#8A001A] hover:bg-[#700015] disabled:opacity-50 rounded-full text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
                >
                  {addingPass ? 'Menambahkan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-200">
            <div className="bg-[#8A001A] text-white px-6 py-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-white tracking-wide">
                Tambah Pengguna
              </h3>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Tutup modal tambah pengguna"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div className="flex flex-col items-center justify-center mb-2">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gray-200 border-2 border-gray-300 flex items-center justify-center overflow-hidden shadow-sm">
                    {addUserAvatarPreview ? (
                      <img src={addUserAvatarPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-10 h-10 text-gray-400 fill-gray-400" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => addFileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-1.5 bg-[#8A001A] text-white rounded-full shadow-md hover:bg-[#700015] transition-colors cursor-pointer"
                    title="Pilih foto profil"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                  <input
                    ref={addFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAddUserAvatarSelect}
                    className="hidden"
                  />
                </div>
                <span className="text-[11px] text-gray-500 font-medium mt-1">Unggah Foto Profil</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#4A000E] mb-1.5">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    value={addUserForm.fullname}
                    onChange={(e) => setAddUserForm({ ...addUserForm, fullname: e.target.value })}
                    required
                    placeholder="Contoh: Dimas Prakoso"
                    className="w-full bg-white border-2 border-black rounded-full px-4 py-1.5 text-xs text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4A000E] mb-1.5">
                    Username
                  </label>
                  <input
                    type="text"
                    value={addUserForm.username}
                    onChange={(e) => setAddUserForm({ ...addUserForm, username: e.target.value })}
                    required
                    placeholder="dimas.resepsionis"
                    className="w-full bg-white border-2 border-black rounded-full px-4 py-1.5 text-xs text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#4A000E] mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={addUserForm.email}
                    onChange={(e) => setAddUserForm({ ...addUserForm, email: e.target.value })}
                    required
                    placeholder="dimas@seamolec.org"
                    className="w-full bg-white border-2 border-black rounded-full px-4 py-1.5 text-xs text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4A000E] mb-1.5">
                    No. HP
                  </label>
                  <input
                    type="text"
                    value={addUserForm.telephone}
                    onChange={(e) => setAddUserForm({ ...addUserForm, telephone: e.target.value })}
                    placeholder="081377788899"
                    className="w-full bg-white border-2 border-black rounded-full px-4 py-1.5 text-xs text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#4A000E] mb-1.5">
                    Peran
                  </label>
                  <div className="relative">
                    <select
                      value={addUserForm.role_code}
                      onChange={(e) => setAddUserForm({ ...addUserForm, role_code: e.target.value })}
                      className="w-full bg-white border-2 border-black rounded-full px-4 py-1.5 text-xs text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30 appearance-none cursor-pointer"
                    >
                      <option value="PETUGAS">Resepsionis</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-700 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4A000E] mb-1.5">
                    Password Awal
                  </label>
                  <input
                    type="text"
                    value={addUserForm.password}
                    onChange={(e) => setAddUserForm({ ...addUserForm, password: e.target.value })}
                    placeholder="Default: 123456"
                    className="w-full bg-white border-2 border-black rounded-full px-4 py-1.5 text-xs text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30"
                  />
                </div>
              </div>

              <div className="border-b border-gray-200 pt-2" />

              <div className="flex items-center justify-end space-x-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-6 py-1.5 bg-white border-2 border-black rounded-full text-xs font-bold text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={addingUser}
                  className="px-6 py-1.5 bg-[#8A001A] hover:bg-[#700015] disabled:opacity-50 rounded-full text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
                >
                  {addingUser ? 'Menambahkan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-200">
            <div className="bg-[#8A001A] text-white px-6 py-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-white tracking-wide">
                Edit Pengguna
              </h3>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Tutup modal edit pengguna"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div className="flex flex-col items-center justify-center mb-2">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gray-200 border-2 border-gray-300 flex items-center justify-center overflow-hidden shadow-sm">
                    {editUserAvatarPreview ? (
                      <img src={editUserAvatarPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-10 h-10 text-gray-400 fill-gray-400" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-1.5 bg-[#8A001A] text-white rounded-full shadow-md hover:bg-[#700015] transition-colors cursor-pointer"
                    title="Ganti foto profil"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                  <input
                    ref={editFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleEditUserAvatarSelect}
                    className="hidden"
                  />
                </div>
                <span className="text-[11px] text-gray-500 font-medium mt-1">Ganti Foto Profil</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#4A000E] mb-1.5">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    value={editUserForm.fullname}
                    onChange={(e) => setEditUserForm({ ...editUserForm, fullname: e.target.value })}
                    required
                    className="w-full bg-white border-2 border-black rounded-full px-4 py-1.5 text-xs text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4A000E] mb-1.5">
                    Username
                  </label>
                  <input
                    type="text"
                    value={editUserForm.username}
                    onChange={(e) => setEditUserForm({ ...editUserForm, username: e.target.value })}
                    required
                    className="w-full bg-white border-2 border-black rounded-full px-4 py-1.5 text-xs text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#4A000E] mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editUserForm.email}
                    onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                    required
                    className="w-full bg-white border-2 border-black rounded-full px-4 py-1.5 text-xs text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4A000E] mb-1.5">
                    No. HP
                  </label>
                  <input
                    type="text"
                    value={editUserForm.telephone}
                    onChange={(e) => setEditUserForm({ ...editUserForm, telephone: e.target.value })}
                    className="w-full bg-white border-2 border-black rounded-full px-4 py-1.5 text-xs text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-xs font-bold text-[#4A000E] mb-1.5">
                    Peran
                  </label>
                  <div className="relative">
                    <select
                      value={editUserForm.role_code}
                      onChange={(e) => setEditUserForm({ ...editUserForm, role_code: e.target.value })}
                      className="w-full bg-white border-2 border-black rounded-full px-4 py-1.5 text-xs text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30 appearance-none cursor-pointer"
                    >
                      <option value="PETUGAS">Resepsionis</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-700 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4A000E] mb-1.5">
                    Status aktif
                  </label>
                  <div className="flex items-center space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditUserForm({ ...editUserForm, is_active: !editUserForm.is_active })}
                      className={`w-9 h-5 rounded-full transition-colors relative inline-flex items-center cursor-pointer p-0.5 ${
                        editUserForm.is_active ? 'bg-[#1E5631]' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full bg-white transition-transform ${
                          editUserForm.is_active ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <span className="text-xs font-semibold text-gray-800">
                      {editUserForm.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-b border-gray-200 pt-2" />

              <div className="flex items-center justify-end space-x-3 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-6 py-1.5 bg-white border-2 border-black rounded-full text-xs font-bold text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="px-6 py-1.5 bg-[#8A001A] hover:bg-[#700015] disabled:opacity-50 rounded-full text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
                >
                  {savingUser ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resetPasswordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-200">
            <div className="bg-[#8A001A] text-white px-6 py-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-white tracking-wide flex items-center space-x-2">
                <KeyRound className="w-4 h-4 text-white" />
                <span>Reset Password Pengguna</span>
              </h3>
              <button
                type="button"
                onClick={() => setResetPasswordUser(null)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Tutup modal reset password"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900">
                <p className="font-semibold mb-1">
                  Atur ulang password untuk akun:
                </p>
                <p className="text-gray-800">
                  <span className="font-bold text-gray-900">{resetPasswordUser.fullname}</span>{' '}
                  (<span className="font-mono text-gray-700">@{resetPasswordUser.username}</span>)
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A000E] mb-1.5">
                  Password Baru
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={newResetPassword}
                    onChange={(e) => setNewResetPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Minimal 6 karakter"
                    className="w-full bg-white border-2 border-black rounded-full pl-4 pr-20 py-2 text-xs text-gray-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      title="Salin password"
                      className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-semibold rounded-lg flex items-center space-x-1 cursor-pointer transition-colors"
                    >
                      {copiedPassword ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600">Disalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-gray-600" />
                          <span>Salin</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1 px-1">
                  <span className="text-[10px] text-gray-500">Minimal 6 karakter</span>
                  <button
                    type="button"
                    onClick={() => setNewResetPassword('123456')}
                    className="text-[10px] text-[#8A001A] font-bold hover:underline cursor-pointer"
                  >
                    Gunakan Default: 123456
                  </button>
                </div>
              </div>

              <div className="border-b border-gray-200 pt-2" />

              <div className="flex items-center justify-end space-x-3 pt-1">
                <button
                  type="button"
                  onClick={() => setResetPasswordUser(null)}
                  className="px-6 py-1.5 bg-white border-2 border-black rounded-full text-xs font-bold text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={resettingPassword}
                  className="px-6 py-1.5 bg-[#8A001A] hover:bg-[#700015] disabled:opacity-50 rounded-full text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
                >
                  {resettingPassword ? 'Menyimpan...' : 'Simpan Password Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
