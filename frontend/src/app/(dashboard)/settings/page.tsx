'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api, { resolveServerUrl } from '@/lib/api';
import RoleMembersModal, { RoleOption } from '@/components/RoleMembersModal';
import AccessAuditLog, { ACCESS_AUDIT_REFRESH_EVENT } from '@/components/AccessAuditLog';
import { CheckCircle2, AlertCircle, AlertTriangle, Eye, EyeOff } from 'lucide-react';

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
  smtp_password?: string;
  smtp_encryption?: string;
  smtp_sender_name?: string;
  smtp_sender_email?: string;
  smtp_status?: string;
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

interface RoleItem {
  id_role: number;
  code: string;
  name: string;
  description: string;
  user_count: number;
  display_name: string;
  role_key: string;
}

interface RoleMeta {
  id_role: number;
  code: string;
  name: string;
  key: string;
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
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const hasAccess = user?.role_code === 'ADMIN' || user?.permissions?.includes('*') || user?.permissions?.includes('settings.manage');

  useEffect(() => {
    if (!authLoading && user && !hasAccess) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router, hasAccess]);

  const [activeTab, setActiveTab] = useState<TabType>('umum');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [logoPreview, setLogoPreview] = useState<string>('/seamolec-logo.png');
  const [testingEmail, setTestingEmail] = useState(false);
  const [sendingMonthlyReport, setSendingMonthlyReport] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleModalData, setRoleModalData] = useState<{ id_role?: number; name: string; description: string }>({
    name: '',
    description: '',
  });
  const [roleModalError, setRoleModalError] = useState('');
  const [savingRole, setSavingRole] = useState(false);
  const [rolesList, setRolesList] = useState<RoleItem[]>([]);
  const [rolesMeta, setRolesMeta] = useState<RoleMeta[]>([]);
  const [membersRole, setMembersRole] = useState<RoleOption | null>(null);
  const [matrix, setMatrix] = useState<any[]>(permissionsMatrix);
  const [pendingPermissionChange, setPendingPermissionChange] = useState<{
    featureIndex: number;
    featureName: string;
    role: string;
    roleKey: string;
    currentVal: boolean;
  } | null>(null);
  const [showPermissionWarningModal, setShowPermissionWarningModal] = useState(false);
  const [showSsoSecret, setShowSsoSecret] = useState(false);
  const [copiedRedirectUri, setCopiedRedirectUri] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Tab Umum bekerja seperti halaman Profil: kolom terkunci sampai tombol Edit ditekan.
  const [isEditingUmum, setIsEditingUmum] = useState(false);
  const [pendingLogo, setPendingLogo] = useState<string | null>(null);
  const [savedLogoPreview, setSavedLogoPreview] = useState<string>('/seamolec-logo.png');
  const [umumSnapshot, setUmumSnapshot] = useState<{ institution_name: string; opening_time: string; closing_time: string } | null>(null);
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  const [backups, setBackups] = useState<any[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [triggeringBackup, setTriggeringBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [cleaningRetention, setCleaningRetention] = useState(false);

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
    fetchMatrix();
    fetchRoles();
  }, []);

  const refreshAccessData = () => {
    fetchRoles();
    fetchMatrix();
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(ACCESS_AUDIT_REFRESH_EVENT));
  };

  const fetchRoles = async () => {
    try {
      const res = await api.get('/auth/roles');
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setRolesList(res.data.data);
      }
    } catch {
      // fallback
    }
  };

  const fetchMatrix = async () => {
    try {
      const res = await api.get('/auth/roles/matrix');
      if (res.data?.success) {
        if (Array.isArray(res.data?.data)) {
          setMatrix(res.data.data);
        }
        if (Array.isArray(res.data?.roles)) {
          setRolesMeta(res.data.roles);
        }
      }
    } catch {
      // fallback to permissionsMatrix
    }
  };

  const handleOpenAddRole = () => {
    setRoleModalData({ id_role: undefined, name: '', description: '' });
    setRoleModalError('');
    setShowRoleModal(true);
  };

  const handleOpenEditRole = (role: RoleItem) => {
    setRoleModalData({
      id_role: role.id_role,
      name: role.display_name || role.name,
      description: role.description || '',
    });
    setRoleModalError('');
    setShowRoleModal(true);
  };

  const handleSaveRole = async () => {
    if (!roleModalData.name.trim()) {
      setRoleModalError('Nama role wajib diisi.');
      return;
    }
    setSavingRole(true);
    setRoleModalError('');
    try {
      if (roleModalData.id_role) {
        const res = await api.put(`/auth/roles/${roleModalData.id_role}`, {
          name: roleModalData.name,
          description: roleModalData.description,
        });
        setSuccessMessage(res.data?.message || 'Data role berhasil diperbarui.');
      } else {
        const res = await api.post('/auth/roles', {
          name: roleModalData.name,
          description: roleModalData.description,
        });
        setSuccessMessage(res.data?.message || 'Role baru berhasil ditambahkan.');
      }
      setShowRoleModal(false);
      setRoleModalData({ name: '', description: '' });
      setTimeout(() => setSuccessMessage(''), 3000);
      refreshAccessData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal menyimpan role.';
      setRoleModalError(msg);
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(''), 4000);
    } finally {
      setSavingRole(false);
    }
  };

  const handleDeleteRole = async (role: RoleItem) => {
    if (!window.confirm(`Yakin ingin menghapus role "${role.display_name || role.name}"?`)) {
      return;
    }
    try {
      const res = await api.delete(`/auth/roles/${role.id_role}`);
      setSuccessMessage(res.data?.message || `Role "${role.name}" berhasil dihapus.`);
      setTimeout(() => setSuccessMessage(''), 3000);
      refreshAccessData();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Gagal menghapus role.');
      setTimeout(() => setErrorMessage(''), 4000);
    }
  };

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
          admin_notification_email: d.admin_notification_email || '',
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
        setSavedNotifEmail(d.admin_notification_email || '');
        if (d.logo_path) {
          const url = resolveServerUrl(`/api/v1/settings/logo/${d.logo_path}`) || '/seamolec-logo.png';
          setLogoPreview(url);
          setSavedLogoPreview(url);
        }
      }
    } catch {
      setLogoPreview('/seamolec-logo.png');
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

  const handleExecuteRetention = async () => {
    if (
      !window.confirm(
        `Jalankan pembersihan data sekarang berdasarkan kebijakan retensi (${formData.guest_photo_retention_months || 6} bulan foto & ${formData.visit_data_retention_years || 5} tahun kunjungan)? Tindakan ini akan menghapus foto tamu dan riwayat kunjungan yang telah melampaui batas retensi.`
      )
    ) {
      return;
    }
    try {
      setCleaningRetention(true);
      const res = await api.post('/settings/retention/cleanup', {
        guest_photo_retention_months: formData.guest_photo_retention_months,
        visit_data_retention_years: formData.visit_data_retention_years,
      });
      const data = res.data?.data;
      setSuccessMessage(
        res.data?.message ||
          `Pembersihan retensi selesai: ${data?.photos_cleaned || 0} file foto dibersihkan, ${data?.visits_purged || 0} riwayat kunjungan kedaluwarsa dihapus.`
      );
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Gagal menjalankan pembersihan retensi data.');
      setTimeout(() => setErrorMessage(''), 4000);
    } finally {
      setCleaningRetention(false);
    }
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setLogoPreview(base64);
      setPendingLogo(base64);
    };
    reader.readAsDataURL(file);
  };

  const startEditUmum = () => {
    setUmumSnapshot({
      institution_name: formData.institution_name,
      opening_time: formData.opening_time,
      closing_time: formData.closing_time,
    });
    setIsEditingUmum(true);
  };

  const cancelEditUmum = () => {
    if (umumSnapshot) setFormData({ ...formData, ...umumSnapshot });
    setPendingLogo(null);
    setLogoPreview(savedLogoPreview);
    setIsEditingUmum(false);
  };

  // Logo baru diunggah dulu, baru pengaturan lain disimpan, supaya keduanya tersimpan bersamaan.
  const uploadPendingLogo = async () => {
    if (!pendingLogo) return;
    const res = await api.post('/settings/logo', { logo: pendingLogo });
    const url =
      resolveServerUrl(res.data?.logo_url || (res.data?.logo_path ? `/api/v1/settings/logo/${res.data.logo_path}` : null)) ||
      pendingLogo;
    setLogoPreview(url);
    setSavedLogoPreview(url);
    setPendingLogo(null);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('institution-settings-updated', { detail: { logo_path: res.data?.logo_path, logo_url: url } })
      );
    }
  };

  // Tab Aturan notifikasi tidak punya tombol simpan: setiap perubahan langsung dikirim ke server.
  type NotifKey =
    | 'notify_app_checkin'
    | 'notify_app_backup_fail'
    | 'notify_email_monthly_report'
    | 'notify_email_new_account'
    | 'notify_email_reset_password';

  const toggleNotification = async (key: NotifKey) => {
    const nextValue = !formData[key];
    setFormData((prev) => ({ ...prev, [key]: nextValue }));
    setErrorMessage('');
    try {
      await api.put('/settings', { [key]: nextValue });
      setSuccessMessage(nextValue ? 'Notifikasi diaktifkan.' : 'Notifikasi dinonaktifkan.');
      setTimeout(() => setSuccessMessage(''), 2500);
    } catch (err: any) {
      setFormData((prev) => ({ ...prev, [key]: !nextValue }));
      setErrorMessage(err.response?.data?.message || 'Gagal menyimpan perubahan notifikasi.');
    }
  };

  const [savedNotifEmail, setSavedNotifEmail] = useState<string | null>(null);
  const saveNotificationEmail = async (input: HTMLInputElement) => {
    const value = input.value.trim();
    if (value === (savedNotifEmail ?? '') || !input.checkValidity()) return;
    setErrorMessage('');
    try {
      await api.put('/settings', { admin_notification_email: value });
      setSavedNotifEmail(value);
      setSuccessMessage('Email penerima notifikasi disimpan.');
      setTimeout(() => setSuccessMessage(''), 2500);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Gagal menyimpan email penerima notifikasi.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      if (activeTab === 'umum') await uploadPendingLogo();
      await api.put('/settings', {
        ...formData,
        jwt_access_token_expiry: (formData.jwt_access_token_expiry || 15) * 60,
        jwt_refresh_token_expiry: (formData.jwt_refresh_token_expiry || 7) * 86400,
      });
      setSuccessMessage('Pengaturan berhasil disimpan.');
      if (activeTab === 'umum') setIsEditingUmum(false);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('institution-settings-updated', {
          detail: { institution_name: formData.institution_name }
        }));
      }
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
      const res = await api.post('/settings/smtp/test', {
        smtp_host: formData.smtp_host,
        smtp_port: formData.smtp_port,
        smtp_username: formData.smtp_username,
        smtp_password: formData.smtp_password,
        smtp_encryption: formData.smtp_encryption,
        smtp_sender_name: formData.smtp_sender_name,
        smtp_sender_email: formData.smtp_sender_email,
      });
      setFormData((prev) => ({ ...prev, smtp_status: 'CONNECTED' }));
      setSuccessMessage(res.data?.message || 'Koneksi ke server SMTP berhasil. Email uji telah berhasil dikirim.');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      setFormData((prev) => ({ ...prev, smtp_status: 'ERROR' }));
      setErrorMessage(err.response?.data?.message || 'Gagal mengirim email uji.');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setTestingEmail(false);
    }
  };

  const handleSendMonthlyReport = async () => {
    setSendingMonthlyReport(true);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      const res = await api.post('/settings/notifications/monthly-report', {
        recipient_email: formData.admin_notification_email,
      });
      setSuccessMessage(res.data?.message || 'Rekap laporan bulanan berhasil dikirim ke email admin.');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Gagal mengirim rekap laporan bulanan.');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setSendingMonthlyReport(false);
    }
  };

  const handlePermissionClick = (
    index: number,
    featureName: string,
    role: string,
    roleKey: string,
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

  const confirmPermissionChange = async () => {
    if (!pendingPermissionChange) return;
    const { featureIndex, featureName, role, roleKey } = pendingPermissionChange;

    const nextMatrix = [...matrix];
    nextMatrix[featureIndex] = {
      ...nextMatrix[featureIndex],
      [roleKey]: !nextMatrix[featureIndex][roleKey],
    };

    setMatrix(nextMatrix);
    setShowPermissionWarningModal(false);

    try {
      const res = await api.put('/auth/roles/matrix', { matrix: nextMatrix });
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setMatrix(res.data.data);
      }
      setSuccessMessage(`Hak akses "${featureName}" untuk role ${role} berhasil diperbarui.`);
      refreshAccessData();
      setTimeout(() => setSuccessMessage(''), 3500);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('permissions-updated'));
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Gagal menyimpan perubahan hak akses.');
      setTimeout(() => setErrorMessage(''), 3500);
      fetchMatrix();
    } finally {
      setPendingPermissionChange(null);
    }
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
      <h1 className="text-2xl sm:text-3xl font-bold text-[#3B0A11] tracking-tight">Pengaturan</h1>

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
        <div className="w-full md:w-56 shrink-0 bg-white border border-[#E8DCCB] rounded-2xl p-2 shadow-sm">
          <div className="flex flex-col space-y-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  aria-pressed={isActive}
                  className={`w-full text-left py-2 px-3 text-sm rounded-xl transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A001A] ${
                    isActive
                      ? 'bg-[#8A001A] text-white font-semibold'
                      : 'text-gray-700 font-medium hover:bg-[#FAF2EA] active:bg-[#F3E6D8]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === 'role' ? (
          <div className="flex-1 w-full max-w-3xl space-y-6">
            <div>
              <div className="flex justify-end mb-3">
                <button
                  type="button"
                  onClick={handleOpenAddRole}
                  className="bg-[#8A001A] hover:bg-[#68001a] text-white text-xs font-semibold px-4 py-1.5 rounded-lg shadow-sm transition cursor-pointer"
                >
                  + Tambah role
                </button>
              </div>

              <div className="w-full overflow-x-auto">
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
                    {rolesList.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-gray-500 text-xs">
                          Memuat data role...
                        </td>
                      </tr>
                    ) : (
                      rolesList.map((role) => (
                        <tr key={role.id_role}>
                          <td className="py-3 pr-4">
                            <span className={`px-3.5 py-1 rounded-full text-xs font-semibold inline-block ${
                              role.code === 'ADMIN' ? 'bg-black text-white' : 'bg-[#8A001A] text-white'
                            }`}>
                              {role.display_name || role.name}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-xs text-gray-800 font-medium">
                            {role.description || '—'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                setMembersRole({ id_role: role.id_role, code: role.code, label: role.display_name || role.name })
                              }
                              aria-label={`Lihat ${role.user_count} pengguna dengan role ${role.display_name || role.name}`}
                              className="min-w-[36px] px-3 py-1 rounded-full font-semibold text-[#8A001A] underline underline-offset-2 hover:bg-[#FAF2EA] active:bg-[#F3E6D8] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A001A] tabular-nums"
                            >
                              {role.user_count}
                            </button>
                          </td>
                          <td className="py-3 pl-4 text-center space-x-1.5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleOpenEditRole(role)}
                              className="bg-[#6B7280] hover:bg-[#4B5563] text-white text-xs px-3.5 py-1 rounded-md font-medium transition cursor-pointer"
                            >
                              Edit
                            </button>
                            {role.code !== 'ADMIN' && role.code !== 'PETUGAS' && (
                              <button
                                type="button"
                                onClick={() => handleDeleteRole(role)}
                                className="bg-red-600 hover:bg-red-700 text-white text-xs px-2.5 py-1 rounded-md font-medium transition cursor-pointer"
                                title="Hapus Role"
                              >
                                Hapus
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-[#3B0207] p-2 rounded-2xl shadow-xl">
              <div className="bg-white rounded-2xl border border-[#E8DCCB] shadow-sm p-6">
                <div className="mb-4">
                  <span className="text-[#3B0A11] text-lg font-semibold inline-block">
                    Hak akses per role
                  </span>
                </div>

                {(() => {
                  const displayRoles: RoleMeta[] = rolesMeta.length > 0 ? rolesMeta : (
                    rolesList.length > 0
                      ? rolesList.map(r => ({ id_role: r.id_role, code: r.code, name: r.display_name || r.name, key: r.role_key }))
                      : [
                          { id_role: 1, code: 'ADMIN', name: 'Admin', key: 'admin' },
                          { id_role: 2, code: 'PETUGAS', name: 'Resepsionis', key: 'receptionist' }
                        ]
                  );

                  return (
                    <div className="w-full overflow-x-auto">
                      <table className="w-full text-left text-xs md:text-sm">
                        <thead>
                          <tr className="text-[#3B0207] font-bold">
                            <th className="pb-2 font-bold min-w-[170px]"><span className="border-b border-[#3B0207] pb-0.5">Fitur</span></th>
                            {displayRoles.map((r) => (
                              <th key={r.key} className="pb-2 font-bold text-center px-3 min-w-[95px]">
                                <span className="border-b border-[#3B0207] pb-0.5">{r.name}</span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {matrix.map((item, index) => (
                            <tr key={item.feature || index}>
                              <td className="py-2.5 text-xs text-gray-800 font-medium">{item.feature}</td>
                              {displayRoles.map((r) => {
                                const isGranted = Boolean(item[r.key]);
                                return (
                                  <td key={r.key} className="py-2.5 text-center px-3">
                                    <div className="flex justify-center">
                                      <button
                                        type="button"
                                        onClick={() => handlePermissionClick(index, item.feature, r.name, r.key, isGranted)}
                                        className="group relative focus:outline-none cursor-pointer"
                                        title={`Klik untuk mengubah izin fitur ${item.feature} untuk ${r.name}`}
                                      >
                                        {isGranted ? (
                                          <span className="w-5 h-5 rounded-full bg-[#2D6A4F] group-hover:scale-110 group-hover:ring-2 group-hover:ring-[#8A001A] text-white flex items-center justify-center text-xs font-bold shadow-sm transition">✓</span>
                                        ) : (
                                          <span className="w-5 h-5 rounded-full bg-[#E5E7EB] group-hover:scale-110 group-hover:ring-2 group-hover:ring-[#8A001A] text-gray-500 flex items-center justify-center text-xs font-bold transition">—</span>
                                        )}
                                      </button>
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </div>

            <AccessAuditLog />

            {membersRole && (
              <RoleMembersModal
                role={membersRole}
                roles={rolesList.map((r) => ({ id_role: r.id_role, code: r.code, label: r.display_name || r.name }))}
                onClose={() => setMembersRole(null)}
                onChanged={(message) => {
                  setSuccessMessage(message);
                  setTimeout(() => setSuccessMessage(''), 3500);
                  refreshAccessData();
                }}
              />
            )}
          </div>
        ) : (
          <div className="flex-1 w-full max-w-2xl">
            <div className="bg-white rounded-2xl border border-[#E8DCCB] shadow-sm p-6 md:p-8 min-h-[360px] flex flex-col justify-between">
              {activeTab === 'umum' && (
              <form onSubmit={handleSubmit} className="flex flex-col h-full justify-between">
                <div>
                  <h2 className="text-[#3B0A11] text-lg font-semibold mb-6">Identitas instansi</h2>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                    {/* Kolom kiri: logo, sama seperti foto di halaman Profil. */}
                    <div className="md:col-span-4 flex flex-col items-center text-center">
                      <div className="relative">
                        <div className="w-32 h-32 rounded-full bg-white border-2 border-gray-200 p-3 flex items-center justify-center overflow-hidden shadow-sm">
                          <img
                            src={logoPreview}
                            alt={`Logo ${formData.institution_name}`}
                            width={128}
                            height={128}
                            onError={() => {
                              if (!pendingLogo) setLogoPreview('/seamolec-logo.png');
                            }}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={!isEditingUmum}
                          title={isEditingUmum ? 'Ganti logo instansi' : 'Tekan Edit terlebih dahulu untuk mengganti logo'}
                          className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#4A000E] hover:bg-[#38000A] disabled:bg-gray-500 disabled:hover:bg-gray-500 disabled:cursor-not-allowed text-white text-[11px] font-bold px-4 py-1.5 rounded-full shadow-md transition-colors cursor-pointer whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#4A000E]"
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

                    {/* Kolom kanan: data instansi. */}
                    <div className="md:col-span-8 space-y-4">
                      <div>
                        <label htmlFor="setting-institution" className="block text-xs font-semibold text-gray-800 mb-1">
                          Nama instansi / institusi
                        </label>
                        <input
                          id="setting-institution"
                          type="text"
                          value={formData.institution_name}
                          onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
                          disabled={!isEditingUmum}
                          className="w-full bg-[#F3F4F6] border border-gray-400 rounded-xl px-3.5 py-2 text-sm text-gray-900 font-medium disabled:opacity-80 disabled:cursor-not-allowed focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30 focus:border-[#8A001A] transition-all"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="setting-open" className="block text-xs font-semibold text-gray-800 mb-1">
                            Jam buka
                          </label>
                          <input
                            id="setting-open"
                            type="text"
                            value={formData.opening_time}
                            onChange={(e) => setFormData({ ...formData, opening_time: e.target.value })}
                            disabled={!isEditingUmum}
                            placeholder="07.30"
                            className="w-full bg-[#F3F4F6] border border-gray-400 rounded-xl px-3.5 py-2 text-sm text-gray-900 font-medium tabular-nums disabled:opacity-80 disabled:cursor-not-allowed focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30 focus:border-[#8A001A] transition-all"
                          />
                        </div>
                        <div>
                          <label htmlFor="setting-close" className="block text-xs font-semibold text-gray-800 mb-1">
                            Jam tutup
                          </label>
                          <input
                            id="setting-close"
                            type="text"
                            value={formData.closing_time}
                            onChange={(e) => setFormData({ ...formData, closing_time: e.target.value })}
                            disabled={!isEditingUmum}
                            placeholder="16.00"
                            className="w-full bg-[#F3F4F6] border border-gray-400 rounded-xl px-3.5 py-2 text-sm text-gray-900 font-medium tabular-nums disabled:opacity-80 disabled:cursor-not-allowed focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30 focus:border-[#8A001A] transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 mt-8 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={isEditingUmum ? cancelEditUmum : startEditUmum}
                    className="px-5 py-1.5 bg-[#6B7280] hover:bg-[#555D6B] active:bg-[#4B5260] text-white text-xs font-bold rounded-full transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-500"
                  >
                    {isEditingUmum ? 'Batal' : 'Edit'}
                  </button>
                  <button
                    type="submit"
                    disabled={!isEditingUmum || saving}
                    className="px-5 py-1.5 bg-[#8A001A] hover:bg-[#700015] active:bg-[#5A0011] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-full transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#8A001A]"
                  >
                    {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'smtp' && (
              <form onSubmit={handleSubmit} className="flex flex-col h-full justify-between">
                <div>
                  <div className="mb-6">
                    <span className="text-[#3B0A11] text-lg font-semibold inline-block">
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
                        placeholder="contoh: email-smtp.ap-southeast-1.amazonaws.com"
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
                        placeholder="587 / 465 / 25"
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
                        placeholder="Username atau akun SMTP"
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
                        Password / App Password:
                      </label>
                      <div className="relative">
                        <input
                          type={showSmtpPassword ? 'text' : 'password'}
                          value={formData.smtp_password || ''}
                          onChange={(e) => setFormData({ ...formData, smtp_password: e.target.value })}
                          placeholder="••••••••••••"
                          className="w-full px-3.5 py-1.5 pr-10 rounded-lg border border-gray-600 text-sm font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#8A001A] bg-white shadow-inner"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                        >
                          {showSmtpPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">
                        Nama Pengirim
                      </label>
                      <input
                        type="text"
                        value={formData.smtp_sender_name || ''}
                        onChange={(e) => setFormData({ ...formData, smtp_sender_name: e.target.value })}
                        placeholder="Contoh: buku tamu SEAMOLEC"
                        className="w-full px-3.5 py-1.5 rounded-lg border border-gray-600 text-sm font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#8A001A] bg-white shadow-inner"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-800 mb-1">
                        Email pengirim:
                      </label>
                      <input
                        type="email"
                        value={formData.smtp_sender_email || ''}
                        onChange={(e) => setFormData({ ...formData, smtp_sender_email: e.target.value })}
                        placeholder="Contoh: buktam@seamolec.org"
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
                      className="bg-white hover:bg-gray-50 border border-gray-800 text-gray-900 px-6 py-2 rounded-xl font-medium text-sm shadow-sm transition disabled:opacity-50 flex items-center space-x-1.5"
                    >
                      {testingEmail && (
                        <div className="w-3.5 h-3.5 border-2 border-gray-800 border-t-transparent rounded-full animate-spin mr-1" />
                      )}
                      <span>{testingEmail ? 'Menguji & Mengirim...' : 'Kirim email uji'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex justify-end mt-8 pt-4">
                  {testingEmail ? (
                    <div className="bg-amber-600 text-white text-xs font-semibold px-4 py-1.5 rounded-full flex items-center space-x-1.5 shadow-sm animate-pulse">
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Menguji Koneksi...</span>
                    </div>
                  ) : formData.smtp_status === 'CONNECTED' ? (
                    <div className="bg-[#2D6A4F] text-white text-xs font-semibold px-4 py-1.5 rounded-full flex items-center space-x-1 shadow-sm">
                      <span>✓</span>
                      <span>Terhubung</span>
                    </div>
                  ) : formData.smtp_status === 'ERROR' ? (
                    <div className="bg-red-600 text-white text-xs font-semibold px-4 py-1.5 rounded-full flex items-center space-x-1 shadow-sm">
                      <span>✕</span>
                      <span>Gagal Terhubung</span>
                    </div>
                  ) : (
                    <div className="bg-gray-500 text-white text-xs font-semibold px-4 py-1.5 rounded-full flex items-center space-x-1 shadow-sm">
                      <span>○</span>
                      <span>Belum Terhubung</span>
                    </div>
                  )}
                </div>
              </form>
            )}

            {activeTab === 'notifikasi' && (
              <form onSubmit={handleSubmit} className="flex flex-col h-full justify-between">
                <div>
                  <div className="mb-4">
                    <span className="text-[#3B0A11] text-lg font-semibold inline-block">
                      Notifikasi di aplikasi
                    </span>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between max-w-[280px]">
                      <span className="text-sm font-medium text-gray-800">Tamu check in</span>
                      <button
                        type="button"
                        onClick={() => toggleNotification('notify_app_checkin')}
                        role="switch"
                        aria-checked={!!formData.notify_app_checkin}
                        aria-label="Notifikasi tamu check in"
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2D6A4F] ${
                          formData.notify_app_checkin ? 'bg-[#2D6A4F]' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out mt-0.5 ${
                            formData.notify_app_checkin ? 'translate-x-[18px]' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between max-w-[280px]">
                      <span className="text-sm font-medium text-gray-800">Gagal Backup data</span>
                      <button
                        type="button"
                        onClick={() => toggleNotification('notify_app_backup_fail')}
                        role="switch"
                        aria-checked={!!formData.notify_app_backup_fail}
                        aria-label="Notifikasi gagal backup data"
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2D6A4F] ${
                          formData.notify_app_backup_fail ? 'bg-[#2D6A4F]' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out mt-0.5 ${
                            formData.notify_app_backup_fail ? 'translate-x-[18px]' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <span className="text-[#3B0A11] text-lg font-semibold inline-block">
                      Notifikasi email
                    </span>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between max-w-[280px]">
                      <span className="text-sm font-medium text-gray-800">Laporan bulanan admin</span>
                      <button
                        type="button"
                        onClick={() => toggleNotification('notify_email_monthly_report')}
                        role="switch"
                        aria-checked={!!formData.notify_email_monthly_report}
                        aria-label="Email laporan bulanan admin"
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2D6A4F] ${
                          formData.notify_email_monthly_report ? 'bg-[#2D6A4F]' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out mt-0.5 ${
                            formData.notify_email_monthly_report ? 'translate-x-[18px]' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between max-w-[280px]">
                      <span className="text-sm font-medium text-gray-800">Info akun baru</span>
                      <button
                        type="button"
                        onClick={() => toggleNotification('notify_email_new_account')}
                        role="switch"
                        aria-checked={!!formData.notify_email_new_account}
                        aria-label="Email info akun baru"
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2D6A4F] ${
                          formData.notify_email_new_account ? 'bg-[#2D6A4F]' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out mt-0.5 ${
                            formData.notify_email_new_account ? 'translate-x-[18px]' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between max-w-[280px]">
                      <span className="text-sm font-medium text-gray-800">Reset Password</span>
                      <button
                        type="button"
                        onClick={() => toggleNotification('notify_email_reset_password')}
                        role="switch"
                        aria-checked={!!formData.notify_email_reset_password}
                        aria-label="Email reset password"
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2D6A4F] ${
                          formData.notify_email_reset_password ? 'bg-[#2D6A4F]' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out mt-0.5 ${
                            formData.notify_email_reset_password ? 'translate-x-[18px]' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="mt-6">
                    <label htmlFor="notif-email" className="block text-xs font-bold text-[#3B0207] mb-1.5">
                      Email penerima notifikasi admin
                    </label>
                    <input
                      id="notif-email"
                      type="email"
                      value={formData.admin_notification_email || ''}
                      onChange={(e) => setFormData({ ...formData, admin_notification_email: e.target.value })}
                      onBlur={(e) => saveNotificationEmail(e.currentTarget)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.currentTarget.blur();
                        }
                      }}
                      placeholder="nama@instansi.go.id"
                      aria-describedby="notif-email-help"
                      className="w-full max-w-md px-3.5 py-1.5 rounded-lg border border-gray-600 text-sm font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#8A001A] bg-white shadow-inner"
                    />
                    <p id="notif-email-help" className="mt-1 text-[11px] text-gray-600">
                      Tersimpan otomatis.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 mt-8 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleSendMonthlyReport}
                    disabled={sendingMonthlyReport}
                    className="bg-white hover:bg-gray-50 border border-gray-800 text-gray-900 px-5 py-2 rounded-xl font-medium text-xs sm:text-sm shadow-xs transition disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
                  >
                    {sendingMonthlyReport && (
                      <div className="w-3.5 h-3.5 border-2 border-gray-800 border-t-transparent rounded-full animate-spin mr-1" />
                    )}
                    <span>{sendingMonthlyReport ? 'Mengirim Laporan...' : 'Kirim Rekap Laporan Bulanan ke Email'}</span>
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'sso' && (
              <form onSubmit={handleSubmit} className="flex flex-col h-full justify-between space-y-6">
                <div>
                  <div className="mb-6">
                    <h3 className="text-[#8A001A] text-lg font-bold tracking-tight">
                      Keamanan, JWT & SSO
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                      <div>
                        <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-1.5">
                          Masa berlaku akses token(menit):
                        </label>
                        <input
                          type="number"
                          value={formData.jwt_access_token_expiry ?? 5}
                          onChange={(e) => setFormData({ ...formData, jwt_access_token_expiry: Number(e.target.value) })}
                          className="w-full px-3.5 py-2 rounded-lg border border-gray-500 text-sm font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#8A001A] focus:border-[#8A001A] bg-[#F9FBFA]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-1.5">
                          Masa berlaku refresh token(hari):
                        </label>
                        <input
                          type="number"
                          value={formData.jwt_refresh_token_expiry ?? 7}
                          onChange={(e) => setFormData({ ...formData, jwt_refresh_token_expiry: Number(e.target.value) })}
                          className="w-full px-3.5 py-2 rounded-lg border border-gray-500 text-sm font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#8A001A] focus:border-[#8A001A] bg-[#F9FBFA]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                      <div>
                        <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-1.5">
                          Sesi antarmuka(jam):
                        </label>
                        <input
                          type="number"
                          value={formData.session_timeout_hours ?? 8}
                          onChange={(e) => setFormData({ ...formData, session_timeout_hours: Number(e.target.value) })}
                          className="w-full px-3.5 py-2 rounded-lg border border-gray-500 text-sm font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#8A001A] focus:border-[#8A001A] bg-[#F9FBFA]"
                        />
                      </div>
                      <div className="hidden md:block" />
                    </div>

                    <div className="pt-2 pb-1">
                      <label className="flex items-center space-x-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={formData.sso_enabled ?? true}
                          onChange={(e) => setFormData({ ...formData, sso_enabled: e.target.checked })}
                          className="w-4 h-4 text-[#8A001A] accent-[#8A001A] rounded cursor-pointer"
                        />
                        <span className="text-xs md:text-sm font-semibold text-gray-900">
                          Aktifkan login SSO (OAuth 2.0 + OpenID Connect)
                        </span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-1.5">
                        Issuer / identity Provider
                      </label>
                      <input
                        type="text"
                        value={formData.sso_issuer || ''}
                        onChange={(e) => setFormData({ ...formData, sso_issuer: e.target.value })}
                        placeholder="https://accounts.google.com"
                        className="w-full px-3.5 py-2 rounded-lg border border-gray-500 text-sm font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#8A001A] focus:border-[#8A001A] bg-[#F9FBFA]"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                      <div>
                        <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-1.5">
                          Client ID (Aplikasi SSO):
                        </label>
                        <input
                          type="text"
                          value={formData.sso_client_id || ''}
                          onChange={(e) => setFormData({ ...formData, sso_client_id: e.target.value })}
                          placeholder="Contoh: 123456789-abc.apps.googleusercontent.com"
                          className="w-full px-3.5 py-2 rounded-lg border border-gray-500 text-sm font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#8A001A] focus:border-[#8A001A] bg-[#F9FBFA]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-1.5">
                          Client secret:
                        </label>
                        <div className="relative">
                          <input
                            type={showSsoSecret ? 'text' : 'password'}
                            value={formData.sso_client_secret || ''}
                            onChange={(e) => setFormData({ ...formData, sso_client_secret: e.target.value })}
                            placeholder="GOCSPX-••••••••••••"
                            className="w-full px-3.5 py-2 pr-10 rounded-lg border border-gray-500 text-sm font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#8A001A] focus:border-[#8A001A] bg-[#F9FBFA]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSsoSecret(!showSsoSecret)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                            title={showSsoSecret ? 'Sembunyikan secret' : 'Tampilkan secret'}
                          >
                            {showSsoSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {formData.sso_enabled && (
                      <div className="mt-4 p-4 rounded-xl border border-blue-200 bg-blue-50/70 text-xs text-blue-900 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 font-bold text-blue-950">
                            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Integrasi Single Sign-On (SSO / OAuth 2.0) Siap Digunakan</span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              formData.sso_client_id && formData.sso_client_id.trim() !== ''
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {formData.sso_client_id && formData.sso_client_id.trim() !== ''
                              ? 'Client ID Terpasang'
                              : 'Menunggu Pengisian Client ID'}
                          </span>
                        </div>

                        <p className="text-blue-800 leading-relaxed">
                          Sistem telah menyediakan endpoint otentikasi SSO dan tombol <strong>Masuk dengan Akun Google / SSO</strong> di halaman login. Daftarkan URL callback di bawah ini ke Google Cloud Console Anda:
                        </p>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                          <div className="flex-1 bg-white px-3 py-1.5 rounded-lg border border-blue-200 font-mono text-[11px] text-gray-700 select-all overflow-x-auto">
                            {typeof window !== 'undefined' ? `${window.location.origin}/login` : 'http://localhost:3000/login'}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (typeof window !== 'undefined') {
                                navigator.clipboard.writeText(`${window.location.origin}/login`);
                                setCopiedRedirectUri(true);
                                setTimeout(() => setCopiedRedirectUri(false), 2000);
                              }
                            }}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition cursor-pointer text-center text-xs shrink-0"
                          >
                            {copiedRedirectUri ? 'Tersalin ✓' : 'Salin URI'}
                          </button>
                        </div>

                        <div className="text-[11px] text-blue-700 space-y-1 pt-1 border-t border-blue-200/60">
                          <p>
                            • <strong>Authorized Redirect URI:</strong> Masukkan URI di atas pada Google Cloud Console (Credentials &gt; OAuth 2.0 Client ID &gt; Authorized redirect URIs).
                          </p>
                          <p>
                            • <strong>Pencocokan Pengguna:</strong> Akun Google yang digunakan harus memiliki email yang sama dengan salah satu pengguna terdaftar di menu <em>Pengguna &amp; Role</em>.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end mt-8 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-[#8A001A] hover:bg-[#68001a] text-white px-8 py-2.5 rounded-xl font-semibold text-sm shadow-md transition disabled:opacity-50 flex items-center space-x-2"
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
                    <span className="text-[#3B0A11] text-lg font-semibold inline-block">
                      Data & Cadangan Sistem
                    </span>
                  </div>

                  {/* Action Buttons: Instant Backup & Restore from file */}
                  <div className="bg-[#FAF3F0] border border-[#DEB887] rounded-xl p-4 mb-6">
                    <h4 className="text-xs font-bold text-[#8A001A] mb-2">
                      Operasi Cadangan & Pemulihan
                    </h4>
                  
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
                        className="border border-[#0284C7] text-[#0284C7] bg-white hover:bg-sky-50 px-4 py-2 rounded-lg text-xs font-semibold shadow-2xs transition disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
                      >
                        {restoringBackup ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-[#0284C7] border-t-transparent rounded-full animate-spin mr-1" />
                            <span>Memulihkan data...</span>
                          </>
                        ) : (
                          <>
                            
                            <span>Pulihkan dari File (.json)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* List of Backups */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-gray-800">
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
                    <h4 className="text-xs font-bold text-gray-800 mb-3">
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

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleExecuteRetention}
                        disabled={cleaningRetention}
                        className="border border-[#8A001A] text-[#8A001A] hover:bg-[#8A001A]/10 px-4 py-2 rounded-xl text-xs font-semibold shadow-2xs transition disabled:opacity-50 flex items-center justify-center space-x-1.5 cursor-pointer"
                        title="Hapus foto dan riwayat kunjungan yang melebihi batas retensi sekarang"
                      >
                        {cleaningRetention ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-[#8A001A] border-t-transparent rounded-full animate-spin mr-1" />
                            <span>Membersihkan data...</span>
                          </>
                        ) : (
                          <>
                            <span>🧹</span>
                            <span>Jalankan Pembersihan Retensi Sekarang</span>
                          </>
                        )}
                      </button>

                      <button
                        type="submit"
                        disabled={saving}
                        className="bg-[#8A001A] hover:bg-[#68001a] text-white px-6 py-2 rounded-xl font-semibold text-sm shadow transition disabled:opacity-50 flex items-center justify-center space-x-1.5 cursor-pointer"
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
              {roleModalData.id_role ? `Edit Role: ${roleModalData.name}` : '+ Tambah Role Baru'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1">Nama Role</label>
                <input
                  type="text"
                  value={roleModalData.name}
                  onChange={(e) => setRoleModalData({ ...roleModalData, name: e.target.value })}
                  placeholder="Contoh: Security / Operator / Auditor"
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

              {roleModalError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{roleModalError}</span>
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setShowRoleModal(false)}
                disabled={savingRole}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveRole}
                disabled={savingRole}
                className="px-5 py-2 rounded-xl bg-[#8A001A] hover:bg-[#68001a] text-white text-xs font-semibold shadow transition disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
              >
                {savingRole && (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                )}
                <span>Simpan</span>
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

