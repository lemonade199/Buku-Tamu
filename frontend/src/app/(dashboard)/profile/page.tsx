'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api, { getUserAvatarUrl } from '@/lib/api';
import { Camera, CheckCircle2, AlertCircle, User as UserIcon } from 'lucide-react';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();

  const [fullname, setFullname] = useState('');
  const [telephone, setTelephone] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  // Foto yang baru dipilih, belum dikirim ke server sampai "Simpan Perubahan" ditekan.
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Data login tidak menyertakan info foto, jadi foto selalu dicoba dimuat dari server (sama dengan Topbar).
  const serverAvatarUrl = (): string | null => {
    if (!user) return null;
    const base = getUserAvatarUrl(user.id_user);
    return `${base}${base.includes('?') ? '&' : '?'}v=${encodeURIComponent(user.avatar || 'awal')}`;
  };

  useEffect(() => {
    if (user) {
      setFullname(user.fullname || '');
      setTelephone(user.telephone || '');
      setUsername(user.username || '');
      setEmail(user.email || '');
      setPhotoPreview(serverAvatarUrl());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPhotoPreview(result);
      setPendingAvatar(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setFeedback(null);

    try {
      const res = await api.put<{
        success: boolean;
        message: string;
        data: {
          fullname: string;
          username: string;
          email: string;
          telephone: string;
        };
      }>('/auth/profile', {
        fullname,
        telephone,
        username,
        email,
        ...(pendingAvatar ? { avatar: pendingAvatar } : {}),
      });

      updateUser({
        fullname: res.data.data.fullname,
        username: res.data.data.username,
        email: res.data.data.email,
        telephone: res.data.data.telephone,
        // Backend tidak mengembalikan nama file foto, jadi beri penanda baru agar foto dimuat ulang.
        ...(pendingAvatar ? { avatar: `diperbarui-${Date.now()}` } : {}),
      });

      const savedPhoto = Boolean(pendingAvatar);
      setPendingAvatar(null);
      setIsEditing(false);
      setFeedback({
        type: 'success',
        text: savedPhoto ? 'Perubahan berhasil disimpan.' : res.data.message || 'Profil berhasil disimpan.',
      });
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal menyimpan perubahan profil.';
      setFeedback({ type: 'error', text: msg });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      setFeedback({ type: 'error', text: 'Password lama dan baru wajib diisi.' });
      return;
    }
    if (newPassword.length < 6) {
      setFeedback({ type: 'error', text: 'Password baru minimal 6 karakter.' });
      return;
    }

    setSavingPassword(true);
    setFeedback(null);

    try {
      const res = await api.put<{ success: boolean; message: string }>('/auth/password', {
        old_password: oldPassword,
        new_password: newPassword,
      });

      setOldPassword('');
      setNewPassword('');
      setFeedback({ type: 'success', text: res.data.message || 'Password berhasil diperbarui.' });
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal memperbarui password.';
      setFeedback({ type: 'error', text: msg });
    } finally {
      setSavingPassword(false);
    }
  };

  const roleLabel = user?.role_code === 'ADMIN' ? 'Admin' : 'Resepsionis';

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-[#3B0A11] tracking-tight">
        Profil
      </h1>

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

      <div className="bg-white rounded-2xl border border-[#E8DCCB] shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-4 flex flex-col items-center justify-center text-center">
              <div className="relative">
                <div className="w-36 h-36 rounded-full bg-[#D1D5DB] border-2 border-gray-300 flex items-center justify-center overflow-hidden shadow-inner">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt={fullname}
                      className="w-full h-full object-cover"
                      onError={() => {
                        if (!pendingAvatar) setPhotoPreview(null);
                      }}
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-[#9CA3AF] flex items-center justify-center text-white">
                      <UserIcon className="w-16 h-16 text-[#D1D5DB]" />
                    </div>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoSelect}
                  accept="image/*"
                  className="hidden"
                />

                {/* Sama dengan kolom data diri: foto baru bisa diganti setelah tombol Edit ditekan. */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!isEditing}
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#4A000E] hover:bg-[#38000A] disabled:bg-gray-500 disabled:hover:bg-gray-500 disabled:cursor-not-allowed text-white text-[11px] font-bold px-4 py-1.5 rounded-full flex items-center space-x-1.5 shadow-md transition-colors cursor-pointer whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#4A000E]"
                  title={isEditing ? 'Ganti foto profil' : 'Tekan Edit terlebih dahulu untuk mengganti foto'}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Ganti foto</span>
                </button>
              </div>

              <div className="mt-5 space-y-1 w-full">
                <h2 className="text-xl font-bold text-[#4A000E] tracking-tight">
                  {fullname || 'Nama Pengguna'}
                </h2>
                <div>
                  <span className="inline-block bg-black text-white text-[11px] font-bold px-4 py-0.5 rounded-full">
                    {roleLabel}
                  </span>
                </div>
                <p className="text-xs text-gray-500 italic">
                  @{username || 'username'}
                </p>
              </div>
            </div>

            <div className="md:col-span-8">
              <form onSubmit={handleSaveProfile} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-800 mb-1">
                    Nama Lengkap:
                  </label>
                  <input
                    type="text"
                    value={fullname}
                    onChange={(e) => setFullname(e.target.value)}
                    disabled={!isEditing}
                    required
                    className="w-full bg-[#F3F4F6] border border-gray-400 rounded-xl px-3.5 py-2 text-xs text-gray-900 font-medium disabled:opacity-80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30 focus:border-[#8A001A] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-800 mb-1">
                    No.:
                  </label>
                  <input
                    type="text"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    disabled={!isEditing}
                    className="w-full bg-[#F3F4F6] border border-gray-400 rounded-xl px-3.5 py-2 text-xs text-gray-900 font-medium disabled:opacity-80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30 focus:border-[#8A001A] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-800 mb-1">
                    Username:
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={!isEditing}
                    required
                    className="w-full bg-[#F3F4F6] border border-gray-400 rounded-xl px-3.5 py-2 text-xs text-gray-900 font-medium disabled:opacity-80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30 focus:border-[#8A001A] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-800 mb-1">
                    Email:
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={!isEditing}
                    required
                    className="w-full bg-[#F3F4F6] border border-gray-400 rounded-xl px-3.5 py-2 text-xs text-gray-900 font-medium disabled:opacity-80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30 focus:border-[#8A001A] transition-all"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (isEditing && user) {
                        setFullname(user.fullname || '');
                        setTelephone(user.telephone || '');
                        setUsername(user.username || '');
                        setEmail(user.email || '');
                        // Batal juga membuang foto yang belum disimpan.
                        setPendingAvatar(null);
                        setPhotoPreview(serverAvatarUrl());
                      }
                      setIsEditing(!isEditing);
                    }}
                    className="px-5 py-1.5 bg-[#6B7280] hover:bg-[#555D6B] text-white text-xs font-bold rounded-full transition-colors cursor-pointer shadow-2xs"
                  >
                    {isEditing ? 'Batal' : 'Edit'}
                  </button>
                  <button
                    type="submit"
                    disabled={!isEditing || savingProfile}
                    className="px-5 py-1.5 bg-[#8A001A] hover:bg-[#700015] disabled:opacity-50 text-white text-xs font-bold rounded-full transition-colors cursor-pointer shadow-2xs"
                  >
                    {savingProfile ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="border-b-2 border-[#8A001A] my-6" />

          <div className="space-y-4">
            <h3 className="text-base font-bold text-gray-900">
              Ubah Password
            </h3>

            <form onSubmit={handleChangePassword}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-800 mb-1">
                    Password lama
                  </label>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Masukkan password lama"
                    className="w-full bg-[#F3F4F6] border border-gray-400 rounded-xl px-3.5 py-2 text-xs text-gray-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30 focus:border-[#8A001A] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-800 mb-1">
                    Password baru
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full bg-[#F3F4F6] border border-gray-400 rounded-xl px-3.5 py-2 text-xs text-gray-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30 focus:border-[#8A001A] transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  disabled={savingPassword || !oldPassword || !newPassword}
                  className="px-5 py-1.5 bg-[#8A001A] hover:bg-[#700015] disabled:opacity-50 text-white text-xs font-bold rounded-full transition-colors cursor-pointer shadow-2xs"
                >
                  {savingPassword ? 'Memperbarui...' : 'Ubah Password'}
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}