'use client';

import React, { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';

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
  sso_client_secret?: string;
  session_timeout_hours?: number;
  guest_photo_retention_months?: number;
  visit_data_retention_years?: number;
  auto_backup_enabled?: boolean;
  auto_backup_schedule?: string;
}

const permissionsMatrix = [
  { feature: 'Dashboard', admin: true, receptionist: true },
  { feature: 'Penerimaan tamu', admin: false, receptionist: true },
  { feature: 'Serahkan kartu', admin: false, receptionist: true },
  { feature: 'Pengembalian akses', admin: false, receptionist: true },
  { feature: 'Monitoring kartu pass', admin: true, receptionist: true },
  { feature: 'Laporan & ekspor', admin: true, receptionist: true },
  { feature: 'Master data (kartu pass & pengguna', admin: true, receptionist: false },
  { feature: 'Pengguna & role', admin: true, receptionist: false },
  { feature: 'Pengaturan sistem', admin: true, receptionist: false },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('umum');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [logoPreview, setLogoPreview] = useState<string>('/seamolec-logo.jpg');
  const [testingEmail, setTestingEmail] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleModalData, setRoleModalData] = useState({ name: '', description: '' });
  const [matrix, setMatrix] = useState(permissionsMatrix);
  const [pendingPermissionChange, setPendingPermissionChange] = useState<{
    featureIndex: number;
    featureName: string;
    role: 'Admin' | 'Resepsionis';
    roleKey: 'admin' | 'receptionist';
    currentVal: boolean;
  } | null>(null);
  const [showPermissionWarningModal, setShowPermissionWarningModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  const [backups, setBackups] = useState<any[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [triggeringBackup, setTriggeringBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(false);

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
    jwt_access_token_expiry: 5,
    jwt_refresh_token_expiry: 7,
    session_timeout_hours: 8,
    sso_enabled: true,
    sso_issuer: 'https://accounts.google.com',
    sso_client_id: 'bukutamu-seamolec',
    sso_client_secret: '',
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
          jwt_access_token_expiry: d.jwt_access_token_expiry ? Math.round(d.jwt_access_token_expiry / 60) : 5,
          jwt_refresh_token_expiry: d.jwt_refresh_token_expiry ? Math.round(d.jwt_refresh_token_expiry / 86400) : 7,
          session_timeout_hours: d.session_timeout_hours ?? 8,
          sso_enabled: d.sso_enabled ?? true,
          sso_issuer: d.sso_issuer || 'https://accounts.google.com',
          sso_client_id: d.sso_client_id || 'bukutamu-seamolec',
          sso_client_secret: d.sso_client_secret || '',
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

  useEffect(() => {
    if (activeTab === 'backup') {
      fetchBackups();
    }
  }, [activeTab]);

  const fetchBackups = async () => {
    try {
      setLoadingBackups(true);
      const res = await api.get('/settings/backups');
      setBackups(res.data.data || []);
    } catch {
      // keep fallback empty
    } finally {
      setLoadingBackups(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setTriggeringBackup(true);
      const res = await api.post('/settings/backup');
      setSuccessMessage(res.data.message || 'Cadangan database berhasil dibuat.');
      setTimeout(() => setSuccessMessage(''), 4000);
      fetchBackups();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Gagal membuat cadangan database.');
      setTimeout(() => setErrorMessage(''), 4000);
    } finally {
      setTriggeringBackup(false);
    }
  };

  const handleDownloadBackup = async (filename: string) => {
    try {
      const res = await api.get(`/settings/backup/download/${filename}`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Gagal mengunduh file cadangan.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleRestoreBackup = async (filename: string) => {
    if (!window.confirm(`PERINGATAN: Memulihkan database dari '${filename}' akan menimpa data yang ada saat ini. Lanjutkan?`)) {
      return;
    }
    try {
      setRestoringBackup(true);
      const res = await api.post('/settings/restore', { filename });
      setSuccessMessage(res.data.message || 'Database berhasil dipulihkan.');
      setTimeout(() => setSuccessMessage(''), 5000);
      fetchSettings();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Gagal memulihkan database.');
      setTimeout(() => setErrorMessage(''), 4000);
    } finally {
      setRestoringBackup(false);
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    if (!window.confirm(`Yakin ingin menghapus file cadangan '${filename}'?`)) {
      return;
    }
    try {
      await api.delete(`/settings/backup/${filename}`);
      setSuccessMessage(`File cadangan '${filename}' berhasil dihapus.`);
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchBackups();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Gagal menghapus file cadangan.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleUploadRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm(`PERINGATAN: Memulihkan database dari file '${file.name}' akan menimpa data yang ada saat ini. Lanjutkan?`)) {
      if (backupFileInputRef.current) backupFileInputRef.current.value = '';
      return;
    }

    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    try {
      setRestoringBackup(true);
      const res = await api.post('/settings/restore', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccessMessage(res.data.message || 'Database berhasil dipulihkan dari file unggahan.');
      setTimeout(() => setSuccessMessage(''), 5000);
      fetchSettings();
      fetchBackups();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Gagal memulihkan database dari file.');
      setTimeout(() => setErrorMessage(''), 4000);
    } finally {
      setRestoringBackup(false);
      if (backupFileInputRef.current) backupFileInputRef.current.value = '';
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

  const handlePermissionClick = (
    index: number,
    featureName: string,
    role: 'Admin' | 'Resepsionis',
    roleKey: 'admin' | 'receptionist',
    currentVal: boolean
  ) => {
    setPendingPermissionChange({
      featureIndex: index,
      featureName,
      role,
      roleKey,
      currentVal,
    });
    setShowPermissionWarningModal(true);
  };

  const confirmPermissionChange = () => {
    if (!pendingPermissionChange) return;
    const { featureIndex, featureName, role, roleKey } = pendingPermissionChange;

    setMatrix((prev) => {
      const next = [...prev];
      next[featureIndex] = {
        ...next[featureIndex],
        [roleKey]: !next[featureIndex][roleKey],
      };
      return next;
    });

    setShowPermissionWarningModal(false);
    setSuccessMessage(`Hak akses "${featureName}" untuk role ${role} berhasil diperbarui.`);
    setTimeout(() => setSuccessMessage(''), 3500);
    setPendingPermissionChange(null);
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: 'umum', label: 'Umum' },
    { key: 'smtp', label: 'SMTP' },
    { key: 'notifikasi', label: 'Aturan notifikasi' },
    { key: 'role', label: 'Role & hak akses' },
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

        {activeTab === 'role' ? (
          <div className="flex-1 w-full max-w-2xl space-y-6">
            <div>
              <div className="flex justify-end mb-3">
                <button
                  type="button"
                  onClick={() => {
                    setRoleModalData({ name: '', description: '' });
                    setShowRoleModal(true);
                  }}
                  className="bg-[#8A001A] hover:bg-[#68001a] text-white text-xs font-semibold px-4 py-1.5 rounded-lg shadow-sm transition"
                >
                  + Tambah role
                </button>
              </div>

              <div className="w-full">
                <table className="w-full text-left text-xs md:text-sm">
                  <thead>
                    <tr className="text-[#3B0207] font-bold">
                      <th className="pb-2 font-bold"><span className="border-b border-[#3B0207] pb-0.5">Role</span></th>
                      <th className="pb-2 font-bold"><span className="border-b border-[#3B0207] pb-0.5">Deskripsi</span></th>
                      <th className="pb-2 font-bold text-center"><span className="border-b border-[#3B0207] pb-0.5">Jumlah pengguna</span></th>
                      <th className="pb-2 font-bold text-center"><span className="border-b border-[#3B0207] pb-0.5">Aksi</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="py-3 pr-4">
                        <span className="bg-black text-white px-4 py-1 rounded-full text-xs font-semibold inline-block">
                          Admin
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-xs text-gray-800 font-medium">
                        Mengatur sistem, master data, pengguna, dan laporan
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-gray-800">
                        1
                      </td>
                      <td className="py-3 pl-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setRoleModalData({ name: 'Admin', description: 'Mengatur sistem, master data, pengguna, dan laporan' });
                            setShowRoleModal(true);
                          }}
                          className="bg-[#6B7280] hover:bg-[#4B5563] text-white text-xs px-3.5 py-1 rounded-md font-medium transition"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4">
                        <span className="bg-[#8A001A] text-white px-3 py-1 rounded-full text-xs font-semibold inline-block">
                          Resepsionis
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-xs text-gray-800 font-medium">
                        Melayani penerimaan dan pengembalian tamu
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-gray-800">
                        3
                      </td>
                      <td className="py-3 pl-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setRoleModalData({ name: 'Resepsionis', description: 'Melayani penerimaan dan pengembalian tamu' });
                            setShowRoleModal(true);
                          }}
                          className="bg-[#6B7280] hover:bg-[#4B5563] text-white text-xs px-3.5 py-1 rounded-md font-medium transition"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-[#3B0207] p-2 rounded-2xl shadow-xl">
              <div className="bg-white rounded-xl border-2 border-[#8A001A] p-6">
                <div className="mb-4">
                  <span className="text-[#8A001A] text-base font-bold border-b border-[#8A001A] pb-0.5 inline-block">
                    Hak akses per role
                  </span>
                </div>

                <div className="w-full">
                  <table className="w-full text-left text-xs md:text-sm">
                    <thead>
                      <tr className="text-[#3B0207] font-bold">
                        <th className="pb-2 font-bold"><span className="border-b border-[#3B0207] pb-0.5">Fitur</span></th>
                        <th className="pb-2 font-bold text-center"><span className="border-b border-[#3B0207] pb-0.5">Admin</span></th>
                        <th className="pb-2 font-bold text-center"><span className="border-b border-[#3B0207] pb-0.5">Resepsionis</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {matrix.map((item, index) => (
                        <tr key={item.feature}>
                          <td className="py-2.5 text-xs text-gray-800 font-medium">{item.feature}</td>
                          <td className="py-2.5 text-center">
                            <div className="flex justify-center">
                              <button
                                type="button"
                                onClick={() => handlePermissionClick(index, item.feature, 'Admin', 'admin', item.admin)}
                                className="group relative focus:outline-none cursor-pointer"
                                title={`Klik untuk mengubah izin fitur ${item.feature} untuk Admin`}
                              >
                                {item.admin ? (
                                  <span className="w-5 h-5 rounded-full bg-[#2D6A4F] group-hover:scale-110 group-hover:ring-2 group-hover:ring-[#8A001A] text-white flex items-center justify-center text-xs font-bold shadow-sm transition">✓</span>
                                ) : (
                                  <span className="w-5 h-5 rounded-full bg-[#E5E7EB] group-hover:scale-110 group-hover:ring-2 group-hover:ring-[#8A001A] text-gray-500 flex items-center justify-center text-xs font-bold transition">—</span>
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="py-2.5 text-center">
                            <div className="flex justify-center">
                              <button
                                type="button"
                                onClick={() => handlePermissionClick(index, item.feature, 'Resepsionis', 'receptionist', item.receptionist)}
                                className="group relative focus:outline-none cursor-pointer"
                                title={`Klik untuk mengubah izin fitur ${item.feature} untuk Resepsionis`}
                              >
                                {item.receptionist ? (
                                  <span className="w-5 h-5 rounded-full bg-[#2D6A4F] group-hover:scale-110 group-hover:ring-2 group-hover:ring-[#8A001A] text-white flex items-center justify-center text-xs font-bold shadow-sm transition">✓</span>
                                ) : (
                                  <span className="w-5 h-5 rounded-full bg-[#E5E7EB] group-hover:scale-110 group-hover:ring-2 group-hover:ring-[#8A001A] text-gray-500 flex items-center justify-center text-xs font-bold transition">—</span>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : (
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

            {activeTab === 'sso' && (
              <form onSubmit={handleSubmit} className="flex flex-col h-full justify-between">
                <div>
                  <div className="mb-5">
                    <span className="text-[#8A001A] text-base font-bold border-b border-[#8A001A] pb-0.5 inline-block">
                      Keamanan, JWT & SSO
                    </span>
                  </div>

                  <div className="space-y-3.5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3.5">
                      <div>
                        <label className="block text-xs font-semibold text-gray-800 mb-1">
                          Masa berlaku akses token(menit):
                        </label>
                        <input
                          type="number"
                          value={formData.jwt_access_token_expiry ?? 5}
                          onChange={(e) => setFormData({ ...formData, jwt_access_token_expiry: Number(e.target.value) })}
                          className="w-full px-3.5 py-1.5 rounded-lg border border-gray-600 text-sm font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#8A001A] bg-white shadow-inner"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-800 mb-1">
                          Masa berlaku refresh token(hari):
                        </label>
                        <input
                          type="number"
                          value={formData.jwt_refresh_token_expiry ?? 7}
                          onChange={(e) => setFormData({ ...formData, jwt_refresh_token_expiry: Number(e.target.value) })}
                          className="w-full px-3.5 py-1.5 rounded-lg border border-gray-600 text-sm font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#8A001A] bg-white shadow-inner"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                      <div>
                        <label className="block text-xs font-semibold text-gray-800 mb-1">
                          Sesi antarmuka(jam):
                        </label>
                        <input
                          type="number"
                          value={formData.session_timeout_hours ?? 8}
                          onChange={(e) => setFormData({ ...formData, session_timeout_hours: Number(e.target.value) })}
                          className="w-full px-3.5 py-1.5 rounded-lg border border-gray-600 text-sm font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#8A001A] bg-white shadow-inner"
                        />
                      </div>
                    </div>

                    <div className="pt-1">
                      <label className="flex items-center space-x-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.sso_enabled}
                          onChange={(e) => setFormData({ ...formData, sso_enabled: e.target.checked })}
                          className="w-4 h-4 text-[#8A001A] accent-[#8A001A] rounded"
                        />
                        <span className="text-xs md:text-sm font-medium text-gray-800">
                          Aktifkan login SSO (OAuth 2.0 + OpenID Connect)
                        </span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">
                        Issuer / identity Provider
                      </label>
                      <input
                        type="text"
                        value={formData.sso_issuer || ''}
                        onChange={(e) => setFormData({ ...formData, sso_issuer: e.target.value })}
                        placeholder="https://accounts.google.com"
                        className="w-full px-3.5 py-1.5 rounded-lg border border-gray-600 text-sm font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#8A001A] bg-white shadow-inner"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3.5">
                      <div>
                        <label className="block text-xs font-semibold text-gray-800 mb-1">
                          Client ID (Aplikasi SSO):
                        </label>
                        <input
                          type="text"
                          value={formData.sso_client_id || ''}
                          onChange={(e) => setFormData({ ...formData, sso_client_id: e.target.value })}
                          placeholder="bukutamu-seamolec"
                          className="w-full px-3.5 py-1.5 rounded-lg border border-gray-600 text-sm font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#8A001A] bg-white shadow-inner"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-800 mb-1">
                          Client secret:
                        </label>
                        <input
                          type="password"
                          value={formData.sso_client_secret || ''}
                          onChange={(e) => setFormData({ ...formData, sso_client_secret: e.target.value })}
                          className="w-full px-3.5 py-1.5 rounded-lg border border-gray-600 text-sm font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#8A001A] bg-white shadow-inner"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-8 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-[#8A001A] hover:bg-[#68001a] text-white px-7 py-2 rounded-xl font-semibold text-sm shadow transition disabled:opacity-50 flex items-center space-x-1.5"
                  >
                    <span>✓</span>
                    <span>Simpan</span>
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'backup' && (
              <div className="flex flex-col h-full justify-between space-y-6">
                <div>
                  <div className="mb-5">
                    <span className="text-[#8A001A] text-base font-bold border-b border-[#8A001A] pb-0.5 inline-block">
                      Data & Cadangan Sistem
                    </span>
                  </div>

                  {/* Action Buttons: Instant Backup & Restore from file */}
                  <div className="bg-[#FAF3F0] border border-[#DEB887] rounded-xl p-4 mb-6">
                    <h4 className="text-xs font-bold text-[#8A001A] uppercase tracking-wide mb-2">
                      Operasi Cadangan & Pemulihan
                    </h4>
                    <p className="text-xs text-gray-600 mb-3">
                      Buat salinan data lengkap sistem untuk pencegahan kehilangan data, atau pulihkan database dari salinan sebelumnya.
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={handleCreateBackup}
                        disabled={triggeringBackup}
                        className="bg-[#8A001A] hover:bg-[#68001a] text-white px-4 py-2 rounded-lg text-xs font-semibold shadow transition disabled:opacity-50 flex items-center space-x-1.5"
                      >
                        {triggeringBackup ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                            <span>Memproses cadangan...</span>
                          </>
                        ) : (
                          <>
                            <span>💾</span>
                            <span>Cadangkan Sekarang (Backup)</span>
                          </>
                        )}
                      </button>

                      <input
                        type="file"
                        ref={backupFileInputRef}
                        onChange={handleUploadRestoreFile}
                        accept=".json"
                        className="hidden"
                      />

                      <button
                        type="button"
                        onClick={() => backupFileInputRef.current?.click()}
                        disabled={restoringBackup}
                        className="border border-[#8A001A] text-[#8A001A] hover:bg-[#8A001A]/10 px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50 flex items-center space-x-1.5"
                      >
                        {restoringBackup ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-[#8A001A] border-t-transparent rounded-full animate-spin mr-1" />
                            <span>Memulihkan data...</span>
                          </>
                        ) : (
                          <>
                            <span>🔄</span>
                            <span>Pulihkan dari File (.json)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* List of Backups */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                        Daftar Salinan Database Tersedia
                      </h4>
                      <button
                        type="button"
                        onClick={fetchBackups}
                        className="text-xs text-[#8A001A] hover:underline flex items-center space-x-1"
                      >
                        <span>↻ Refresh</span>
                      </button>
                    </div>

                    {loadingBackups ? (
                      <div className="py-6 text-center text-xs text-gray-500">Memuat riwayat cadangan...</div>
                    ) : backups.length === 0 ? (
                      <div className="py-6 text-center text-xs text-gray-400 bg-white rounded-lg border border-dashed border-gray-300">
                        Belum ada salinan database yang dibuat. Klik tombol &ldquo;Cadangkan Sekarang&rdquo; di atas.
                      </div>
                    ) : (
                      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm max-h-[220px] overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#FAF3F0] text-gray-700 font-semibold border-b border-gray-200">
                            <tr>
                              <th className="p-2.5">Nama File</th>
                              <th className="p-2.5">Waktu</th>
                              <th className="p-2.5">Ukuran</th>
                              <th className="p-2.5 text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {backups.map((b) => (
                              <tr key={b.filename} className="hover:bg-gray-50">
                                <td className="p-2.5 font-mono text-[11px] text-gray-800">{b.filename}</td>
                                <td className="p-2.5 text-gray-600">
                                  {new Date(b.created_at).toLocaleString('id-ID', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </td>
                                <td className="p-2.5 text-gray-600">{b.size_formatted}</td>
                                <td className="p-2.5 text-center space-x-1">
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadBackup(b.filename)}
                                    title="Unduh Salinan"
                                    className="px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-medium"
                                  >
                                    Unduh
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRestoreBackup(b.filename)}
                                    disabled={restoringBackup}
                                    title="Pulihkan Database"
                                    className="px-2 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-medium"
                                  >
                                    Pulihkan
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteBackup(b.filename)}
                                    title="Hapus Salinan"
                                    className="px-2 py-0.5 rounded bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-medium"
                                  >
                                    Hapus
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Retention Form */}
                  <form onSubmit={handleSubmit} className="border-t border-gray-200 pt-4">
                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide mb-3">
                      Kebijakan Retensi & Otomasi
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-800 mb-1">
                          Retensi Foto Tamu (bulan)
                        </label>
                        <input
                          type="number"
                          value={formData.guest_photo_retention_months || 6}
                          onChange={(e) => setFormData({ ...formData, guest_photo_retention_months: Number(e.target.value) })}
                          className="w-full px-3 py-1.5 rounded-lg border border-gray-600 text-sm bg-white"
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
                          className="w-full px-3 py-1.5 rounded-lg border border-gray-600 text-sm bg-white"
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.auto_backup_enabled}
                          onChange={(e) => setFormData({ ...formData, auto_backup_enabled: e.target.checked })}
                          className="w-4 h-4 text-[#8A001A] accent-[#8A001A] rounded"
                        />
                        <span className="text-xs md:text-sm font-medium text-gray-800">Aktifkan Backup Otomatis Database Harian</span>
                      </label>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={saving}
                        className="bg-[#8A001A] hover:bg-[#68001a] text-white px-6 py-2 rounded-xl font-semibold text-sm shadow transition disabled:opacity-50 flex items-center space-x-1.5"
                      >
                        <span>✓</span>
                        <span>Simpan pengaturan</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </div>

      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 animate-fadeIn">
            <h3 className="text-lg font-bold text-[#8A001A] mb-4">
              {roleModalData.name ? `Edit Role: ${roleModalData.name}` : 'Tambah Role Baru'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1">Nama Role</label>
                <input
                  type="text"
                  value={roleModalData.name}
                  onChange={(e) => setRoleModalData({ ...roleModalData, name: e.target.value })}
                  placeholder="Nama role..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-400 text-sm font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#8A001A]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1">Deskripsi</label>
                <textarea
                  rows={3}
                  value={roleModalData.description}
                  onChange={(e) => setRoleModalData({ ...roleModalData, description: e.target.value })}
                  placeholder="Deskripsi tugas dan tanggung jawab..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-400 text-sm font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#8A001A]"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setShowRoleModal(false)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-100 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowRoleModal(false);
                  setSuccessMessage('Data role berhasil diperbarui.');
                  setTimeout(() => setSuccessMessage(''), 3000);
                }}
                className="px-5 py-2 rounded-xl bg-[#8A001A] hover:bg-[#68001a] text-white text-xs font-semibold shadow transition"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {showPermissionWarningModal && pendingPermissionChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 animate-fadeIn">
            <div className="w-12 h-12 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-600 mb-3 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900 text-center mb-2">
              Peringatan Perubahan Hak Akses
            </h3>
            <p className="text-xs text-gray-600 text-center leading-relaxed mb-4">
              Anda akan {pendingPermissionChange.currentVal ? 'mencabut' : 'mengaktifkan'} hak akses fitur <strong className="text-gray-900 font-semibold">{pendingPermissionChange.featureName}</strong> untuk role <strong className="text-gray-900 font-semibold">{pendingPermissionChange.role}</strong>.
              <br />
              <span className="text-red-600 font-medium inline-block mt-2">
                Perhatian: Perubahan ini berdampak langsung pada izin menu dan aksi operasional pengguna dengan role ini.
              </span>
            </p>
            <div className="flex justify-center space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowPermissionWarningModal(false);
                  setPendingPermissionChange(null);
                }}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-100 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmPermissionChange}
                className="px-5 py-2 rounded-xl bg-[#8A001A] hover:bg-[#68001a] text-white text-xs font-semibold shadow transition"
              >
                Ya, Ubah Hak Akses
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
