'use client';

import React, { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { CheckCircle2, AlertCircle } from 'lucide-react';

type TabType = 'umum' | 'smtp' | 'notifikasi' | 'role' | 'sso' | 'backup';

interface SettingsData {
  id_setting?: number;
  institution_name: string;
  opening_time: string;
  closing_time: string;
  logo_path?: string | null;
  pass_warning_limit?: number;
  smtp_host?: string;
  smtp_port?: number;
  smtp_username?: string;
  smtp_encryption?: string;
  smtp_sender_name?: string;
  smtp_sender_email?: string;
  notify_app_checkin?: boolean;
  notify_app_backup_fail?: boolean;
  notify_email_monthly_report?: boolean;
  notify_email_new_account?: boolean;
  notify_email_reset_password?: boolean;
  admin_notification_email?: string;
  jwt_access_token_expiry?: number;
  jwt_refresh_token_expiry?: number;
  sso_enabled?: boolean;
  sso_issuer?: string;
  sso_client_id?: string;
  guest_photo_retention_months?: number;
  visit_data_retention_years?: number;
  auto_backup_enabled?: boolean;
  auto_backup_schedule?: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('umum');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [logoPreview, setLogoPreview] = useState<string>('/seamolec-logo.jpg');
  const [testingEmail, setTestingEmail] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<SettingsData>({
    institution_name: 'SEAMOLEC',
    opening_time: '07.30',
    closing_time: '16.00',
    pass_warning_limit: 5,
    smtp_host: 'email-smtp.ap-southeast-1.amazonaws.com',
    smtp_port: 587,
    smtp_username: 'bukutamu-smpt',
    smtp_encryption: 'STARTTLS',
    smtp_sender_name: 'buku tamu SEAMOLEC',
    smtp_sender_email: 'buktam@seamolec.org',
    notify_app_checkin: true,
    notify_app_backup_fail: true,
    notify_email_monthly_report: true,
    notify_email_new_account: true,
    notify_email_reset_password: true,
    admin_notification_email: 'tasha@seamolec.org',
    jwt_access_token_expiry: 15,
    jwt_refresh_token_expiry: 7,
    sso_enabled: false,
    guest_photo_retention_months: 6,
    visit_data_retention_years: 5,
    auto_backup_enabled: true,
    auto_backup_schedule: 'Setiap hari pukul 23:00',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/settings');
      if (res.data && res.data.data) {
        const d = res.data.data;
        setFormData({
          institution_name: d.institution_name || 'SEAMOLEC',
          opening_time: (d.opening_time || '07:30').replace(':', '.'),
          closing_time: (d.closing_time || '16:00').replace(':', '.'),
          pass_warning_limit: d.pass_warning_limit ?? 5,
          smtp_host: d.smtp_host || 'email-smtp.ap-southeast-1.amazonaws.com',
          smtp_port: d.smtp_port ?? 587,
          smtp_username: d.smtp_username || 'bukutamu-smpt',
          smtp_encryption: d.smtp_encryption || 'STARTTLS',
          smtp_sender_name: d.smtp_sender_name || 'buku tamu SEAMOLEC',
          smtp_sender_email: d.smtp_sender_email || 'buktam@seamolec.org',
          notify_app_checkin: d.notify_app_checkin ?? true,
          notify_app_backup_fail: d.notify_app_backup_fail ?? true,
          notify_email_monthly_report: d.notify_email_monthly_report ?? true,
          notify_email_new_account: d.notify_email_new_account ?? true,
          notify_email_reset_password: d.notify_email_reset_password ?? true,
          admin_notification_email: d.admin_notification_email || 'tasha@seamolec.org',
          jwt_access_token_expiry: d.jwt_access_token_expiry ? Math.round(d.jwt_access_token_expiry / 60) : 15,
          jwt_refresh_token_expiry: d.jwt_refresh_token_expiry ? Math.round(d.jwt_refresh_token_expiry / 86400) : 7,
          sso_enabled: d.sso_enabled ?? false,
          sso_issuer: d.sso_issuer || '',
          sso_client_id: d.sso_client_id || '',
          guest_photo_retention_months: d.guest_photo_retention_months ?? 6,
          visit_data_retention_years: d.visit_data_retention_years ?? 5,
          auto_backup_enabled: d.auto_backup_enabled ?? true,
          auto_backup_schedule: d.auto_backup_schedule || 'Setiap hari pukul 23:00',
        });
        if (d.logo_path) {
          setLogoPreview(`/api/v1/settings/logo/${d.logo_path}`);
        }
      }
    } catch {
      setLogoPreview('/seamolec-logo.jpg');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setLogoPreview(base64);
      try {
        await api.post('/settings/logo', { logo: base64 });
        setSuccessMessage('Logo instansi berhasil diperbarui.');
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch (err: any) {
        setErrorMessage(err.response?.data?.message || 'Gagal mengunggah logo.');
        setTimeout(() => setErrorMessage(''), 3000);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      await api.put('/settings', {
        ...formData,
        jwt_access_token_expiry: (formData.jwt_access_token_expiry || 15) * 60,
        jwt_refresh_token_expiry: (formData.jwt_refresh_token_expiry || 7) * 86400,
      });
      setSuccessMessage('Pengaturan berhasil disimpan.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      const res = await api.post('/settings/smtp/test');
      setSuccessMessage(res.data?.message || 'Koneksi ke server SMTP berhasil. Email uji telah berhasil dikirim.');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Gagal mengirim email uji.');
      setTimeout(() => setErrorMessage(''), 4000);
    } finally {
      setTestingEmail(false);
    }
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: 'umum', label: 'Umum' },
    { key: 'smtp', label: 'SMTP' },
    { key: 'notifikasi', label: 'Aturan notifikasi' },
    { key: 'role', label: 'Role & Hak akses' },
    { key: 'sso', label: 'Keamanan & SSO' },
    { key: 'backup', label: 'Data & Backup' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold text-[#3B0207] tracking-tight">Pengaturan</h1>

      {successMessage && (
        <div className="p-3.5 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm flex items-center space-x-2 animate-fadeIn max-w-4xl">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm flex items-center space-x-2 animate-fadeIn max-w-4xl">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="w-full md:w-56 shrink-0 bg-[#FAF7F0] border border-gray-300 rounded-2xl p-4 shadow-sm">
          <div className="flex flex-col space-y-3">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full text-center py-2 px-3 text-xs md:text-sm rounded-lg border transition-all ${
                    isActive
                      ? 'bg-[#E5E7EB] border-gray-400 font-semibold text-gray-900 shadow-sm'
                      : 'bg-white/80 hover:bg-gray-100 border-gray-300 font-medium text-gray-800'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 w-full max-w-2xl bg-[#3B0207] p-2 rounded-2xl shadow-xl">
          <div className="bg-white rounded-xl border-2 border-[#8A001A] p-6 md:p-8 min-h-[360px] flex flex-col justify-between">
            {activeTab === 'umum' && (
              <form onSubmit={handleSubmit} className="flex flex-col h-full justify-between">
                <div>
                  <div className="mb-6">
                    <span className="text-[#8A001A] text-lg font-bold border-b border-[#8A001A] pb-0.5 inline-block">
                      Identitas instansi
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 items-start">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-800 mb-1">
                          No. pass ID:
                        </label>
                        <input
                          type="text"
                          value={formData.institution_name}
                          onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
                          className="w-full max-w-[280px] px-3.5 py-1.5 rounded-lg border border-gray-600 text-sm font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#8A001A] bg-white shadow-inner"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-800 mb-1">
                          Jam buka:
                        </label>
                        <input
                          type="text"
                          value={formData.opening_time}
                          onChange={(e) => setFormData({ ...formData, opening_time: e.target.value })}
                          placeholder="07.30"
                          className="w-full max-w-[280px] px-3.5 py-1.5 rounded-lg border border-gray-600 text-sm font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#8A001A] bg-white shadow-inner"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-800 mb-1">
                          Jam tutup:
                        </label>
                        <input
                          type="text"
                          value={formData.closing_time}
                          onChange={(e) => setFormData({ ...formData, closing_time: e.target.value })}
                          placeholder="16.00"
                          className="w-full max-w-[280px] px-3.5 py-1.5 rounded-lg border border-gray-600 text-sm font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#8A001A] bg-white shadow-inner"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col items-center md:items-start pt-1">
                      <span className="text-xs font-semibold text-gray-800 mb-2">
                        Logo:
                      </span>
                      <div className="w-16 h-16 rounded-full border border-gray-300 p-1 flex items-center justify-center bg-white shadow-sm mb-3 overflow-hidden">
                        <img
                          src={logoPreview}
                          alt="Logo Instansi"
                          className="w-full h-full object-contain rounded-full"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-[#1A1A1A] hover:bg-black text-white text-xs px-4 py-1.5 rounded-lg font-medium transition shadow-sm"
                      >
                        Ganti logo
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleLogoFileChange}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-8 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-[#8A001A] hover:bg-[#68001a] text-white px-6 py-2.5 rounded-xl font-semibold text-sm shadow-md transition disabled:opacity-50"
                  >
                    {saving ? 'Menyimpan...' : 'Simpan pengaturan'}
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'smtp' && (
              <form onSubmit={handleSubmit} className="flex flex-col h-full justify-between">
                <div>
                  <div className="mb-6">
                    <span className="text-[#8A001A] text-lg font-bold border-b border-[#8A001A] pb-0.5 inline-block">
                      Server email (SMTP)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-x-6 gap-y-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">
                        Host:
                      </label>
                      <input
                        type="text"
                        value={formData.smtp_host || ''}
                        onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
                        className="w-full px-3.5 py-1.5 rounded-lg border border-gray-600 text-sm font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#8A001A] bg-white shadow-inner"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">
                        Port:
                      </label>
                      <input
                        type="number"
                        value={formData.smtp_port || 587}
                        onChange={(e) => setFormData({ ...formData, smtp_port: Number(e.target.value) })}
                        className="w-full px-3.5 py-1.5 rounded-lg border border-gray-600 text-sm font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#8A001A] bg-white shadow-inner"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">
                        Username:
                      </label>
                      <input
                        type="text"
                        value={formData.smtp_username || ''}
                        onChange={(e) => setFormData({ ...formData, smtp_username: e.target.value })}
                        className="w-full px-3.5 py-1.5 rounded-lg border border-gray-600 text-sm font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#8A001A] bg-white shadow-inner"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">
                        Enskripsi:
                      </label>
                      <select
                        value={formData.smtp_encryption || 'STARTTLS'}
                        onChange={(e) => setFormData({ ...formData, smtp_encryption: e.target.value })}
                        className="w-full px-3.5 py-1.5 rounded-lg border border-gray-600 text-sm font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#8A001A] bg-white shadow-inner"
                      >
                        <option value="STARTTLS">STARTTLS</option>
                        <option value="SSL/TLS">SSL/TLS</option>
                        <option value="None">None</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">
                        Nama Pengirim
                      </label>
                      <input
                        type="text"
                        value={formData.smtp_sender_name || ''}
                        onChange={(e) => setFormData({ ...formData, smtp_sender_name: e.target.value })}
                        className="w-full px-3.5 py-1.5 rounded-lg border border-gray-600 text-sm font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#8A001A] bg-white shadow-inner"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">
                        Email pengirim:
                      </label>
                      <input
                        type="email"
                        value={formData.smtp_sender_email || ''}
                        onChange={(e) => setFormData({ ...formData, smtp_sender_email: e.target.value })}
                        className="w-full px-3.5 py-1.5 rounded-lg border border-gray-600 text-sm font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#8A001A] bg-white shadow-inner"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 mt-6">
                    <button
                      type="submit"
                      disabled={saving}
                      className="bg-[#8A001A] hover:bg-[#68001a] text-white px-7 py-2 rounded-xl font-semibold text-sm shadow transition disabled:opacity-50 flex items-center space-x-1.5"
                    >
                      <span>✓</span>
                      <span>Simpan</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleTestEmail}
                      disabled={testingEmail}
                      className="bg-white hover:bg-gray-50 border border-gray-800 text-gray-900 px-6 py-2 rounded-xl font-medium text-sm shadow-sm transition disabled:opacity-50"
                    >
                      {testingEmail ? 'Mengirim...' : 'Kirim email uji'}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end mt-8 pt-4">
                  <div className="bg-[#2D6A4F] text-white text-xs font-semibold px-4 py-1.5 rounded-full flex items-center space-x-1 shadow-sm">
                    <span>✓</span>
                    <span>Terhubung</span>
                  </div>
                </div>
              </form>
            )}

            {activeTab === 'notifikasi' && (
              <form onSubmit={handleSubmit} className="flex flex-col h-full justify-between">
                <div>
                  <div className="mb-4">
                    <span className="text-[#8A001A] text-base font-bold border-b border-[#8A001A] pb-0.5 inline-block">
                      Notifikasi di aplikasi
                    </span>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between max-w-[280px]">
                      <span className="text-sm font-medium text-gray-800">Tamu check in</span>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, notify_app_checkin: !formData.notify_app_checkin })}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                          formData.notify_app_checkin ? 'bg-[#2D6A4F]' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out mt-0.5 ${
                            formData.notify_app_checkin ? 'translate-x-4.5 ml-0.5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between max-w-[280px]">
                      <span className="text-sm font-medium text-gray-800">Gagal Backup data</span>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, notify_app_backup_fail: !formData.notify_app_backup_fail })}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                          formData.notify_app_backup_fail ? 'bg-[#2D6A4F]' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out mt-0.5 ${
                            formData.notify_app_backup_fail ? 'translate-x-4.5 ml-0.5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <span className="text-[#8A001A] text-base font-bold border-b border-[#8A001A] pb-0.5 inline-block">
                      Notifikasi email
                    </span>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between max-w-[280px]">
                      <span className="text-sm font-medium text-gray-800">Laporan bulanan admin</span>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, notify_email_monthly_report: !formData.notify_email_monthly_report })}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                          formData.notify_email_monthly_report ? 'bg-[#2D6A4F]' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out mt-0.5 ${
                            formData.notify_email_monthly_report ? 'translate-x-4.5 ml-0.5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between max-w-[280px]">
                      <span className="text-sm font-medium text-gray-800">Info akun baru</span>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, notify_email_new_account: !formData.notify_email_new_account })}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                          formData.notify_email_new_account ? 'bg-[#2D6A4F]' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out mt-0.5 ${
                            formData.notify_email_new_account ? 'translate-x-4.5 ml-0.5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between max-w-[280px]">
                      <span className="text-sm font-medium text-gray-800">Reset Password</span>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, notify_email_reset_password: !formData.notify_email_reset_password })}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                          formData.notify_email_reset_password ? 'bg-[#2D6A4F]' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out mt-0.5 ${
                            formData.notify_email_reset_password ? 'translate-x-4.5 ml-0.5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="block text-xs font-bold text-[#3B0207] mb-1.5">
                      Email penerima notifikasi admin
                    </label>
                    <input
                      type="email"
                      value={formData.admin_notification_email || ''}
                      onChange={(e) => setFormData({ ...formData, admin_notification_email: e.target.value })}
                      placeholder="tasha@seamolec.org"
                      className="w-full max-w-md px-3.5 py-1.5 rounded-lg border border-gray-600 text-sm font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#8A001A] bg-white shadow-inner"
                    />
                  </div>
                </div>

                <div className="flex justify-end mt-8 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-[#8A001A] hover:bg-[#68001a] text-white px-6 py-2.5 rounded-xl font-semibold text-sm shadow-md transition disabled:opacity-50"
                  >
                    Simpan pengaturan
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'role' && (
              <div className="flex flex-col h-full justify-between">
                <div>
                  <div className="mb-6">
                    <span className="text-[#8A001A] text-lg font-bold border-b border-[#8A001A] pb-0.5 inline-block">
                      Role & Hak Akses
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div className="p-3.5 border border-gray-300 rounded-xl bg-gray-50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-gray-900">Administrator</span>
                        <span className="text-[10px] bg-black text-white px-2 py-0.5 rounded-full">Full Access</span>
                      </div>
                      <p className="text-xs text-gray-600">
                        Memiliki akses menyeluruh ke Dashboard, Monitoring Kartu Pass, Laporan, Master Data, dan Pengaturan Sistem.
                      </p>
                    </div>

                    <div className="p-3.5 border border-gray-300 rounded-xl bg-gray-50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-gray-900">Resepsionis / Petugas</span>
                        <span className="text-[10px] bg-[#8A001A] text-white px-2 py-0.5 rounded-full">Front Desk</span>
                      </div>
                      <p className="text-xs text-gray-600">
                        Memiliki akses ke Dashboard operasional, Penerimaan Tamu (Check-in), Pengembalian Akses (Check-out), Kontrol Pass Aktif, dan Riwayat Kunjungan.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-8 pt-4">
                  <span className="text-xs text-gray-500">Konfigurasi role default sistem</span>
                </div>
              </div>
            )}

            {activeTab === 'sso' && (
              <form onSubmit={handleSubmit} className="flex flex-col h-full justify-between">
                <div>
                  <div className="mb-6">
                    <span className="text-[#8A001A] text-lg font-bold border-b border-[#8A001A] pb-0.5 inline-block">
                      Keamanan & SSO
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">
                        JWT Access Token Expiry (menit)
                      </label>
                      <input
                        type="number"
                        value={formData.jwt_access_token_expiry || 15}
                        onChange={(e) => setFormData({ ...formData, jwt_access_token_expiry: Number(e.target.value) })}
                        className="w-full max-w-[280px] px-3 py-1.5 rounded-lg border border-gray-600 text-sm bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">
                        JWT Refresh Token Expiry (hari)
                      </label>
                      <input
                        type="number"
                        value={formData.jwt_refresh_token_expiry || 7}
                        onChange={(e) => setFormData({ ...formData, jwt_refresh_token_expiry: Number(e.target.value) })}
                        className="w-full max-w-[280px] px-3 py-1.5 rounded-lg border border-gray-600 text-sm bg-white"
                      />
                    </div>

                    <div className="pt-2">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.sso_enabled}
                          onChange={(e) => setFormData({ ...formData, sso_enabled: e.target.checked })}
                          className="w-4 h-4 text-[#8A001A] rounded"
                        />
                        <span className="text-sm font-medium text-gray-800">Aktifkan Single Sign-On (SSO)</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-8 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-[#8A001A] hover:bg-[#68001a] text-white px-6 py-2.5 rounded-xl font-semibold text-sm shadow-md transition disabled:opacity-50"
                  >
                    Simpan pengaturan
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'backup' && (
              <form onSubmit={handleSubmit} className="flex flex-col h-full justify-between">
                <div>
                  <div className="mb-6">
                    <span className="text-[#8A001A] text-lg font-bold border-b border-[#8A001A] pb-0.5 inline-block">
                      Data & Backup
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">
                        Retensi Foto Tamu (bulan)
                      </label>
                      <input
                        type="number"
                        value={formData.guest_photo_retention_months || 6}
                        onChange={(e) => setFormData({ ...formData, guest_photo_retention_months: Number(e.target.value) })}
                        className="w-full max-w-[280px] px-3 py-1.5 rounded-lg border border-gray-600 text-sm bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">
                        Retensi Riwayat Kunjungan (tahun)
                      </label>
                      <input
                        type="number"
                        value={formData.visit_data_retention_years || 5}
                        onChange={(e) => setFormData({ ...formData, visit_data_retention_years: Number(e.target.value) })}
                        className="w-full max-w-[280px] px-3 py-1.5 rounded-lg border border-gray-600 text-sm bg-white"
                      />
                    </div>

                    <div className="pt-2">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.auto_backup_enabled}
                          onChange={(e) => setFormData({ ...formData, auto_backup_enabled: e.target.checked })}
                          className="w-4 h-4 text-[#8A001A] rounded"
                        />
                        <span className="text-sm font-medium text-gray-800">Aktifkan Backup Otomatis Database</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-8 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-[#8A001A] hover:bg-[#68001a] text-white px-6 py-2.5 rounded-xl font-semibold text-sm shadow-md transition disabled:opacity-50"
                  >
                    Simpan pengaturan
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
