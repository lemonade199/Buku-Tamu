'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Questrial } from 'next/font/google';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'next/navigation';
import { User, Lock, Eye, EyeOff, AlertCircle, Clock } from 'lucide-react';

// Sama dengan halaman form tamu supaya top bar kedua halaman identik.
const wordmarkFont = Questrial({ weight: '400', subsets: ['latin'], display: 'swap' });

function useCurrentDateTime() {
  const [currentDateTime, setCurrentDateTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setCurrentDateTime(`${days[now.getDay()]}, ${day} ${months[now.getMonth()]} ${now.getFullYear()} · ${hours}:${minutes}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return currentDateTime;
}

function GoogleLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function LoginForm() {
  const { login, loginWithSso } = useAuth();
  const searchParams = useSearchParams();
  const currentDateTime = useCurrentDateTime();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [institutionName, setInstitutionName] = useState('SEAMOLEC');
  const [logoUrl, setLogoUrl] = useState('/seamolec-logo.png');
  const [ssoEnabled, setSsoEnabled] = useState(false);
  const [ssoIssuer, setSsoIssuer] = useState('https://accounts.google.com');
  const [ssoClientId, setSsoClientId] = useState('');

  useEffect(() => {
    const fetchPublicSettings = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
        const res = await fetch(`${apiUrl}/settings/public`);
        const json = await res.json();
        if (json?.success && json?.data) {
          if (json.data.institution_name) setInstitutionName(json.data.institution_name);
          if (json.data.logo_url) setLogoUrl(json.data.logo_url);
          setSsoEnabled(Boolean(json.data.sso_enabled));
          if (json.data.sso_issuer) setSsoIssuer(json.data.sso_issuer);
          if (json.data.sso_client_id) setSsoClientId(json.data.sso_client_id);
        }
      } catch {
        // Fallback to default
      }
    };
    fetchPublicSettings();
  }, []);

  // Handle OAuth callback from URL hash or query
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.startsWith('#') ? window.location.hash.substring(1) : '';
      const params = new URLSearchParams(hash || window.location.search);
      const token = params.get('access_token') || params.get('id_token') || params.get('credential');
      const email = params.get('email');

      if (token || email) {
        setSsoLoading(true);
        loginWithSso({ credential: token || undefined, email: email || undefined })
          .catch((err: any) => {
            setErrorMessage(err.response?.data?.message || 'Gagal masuk menggunakan akun SSO.');
          })
          .finally(() => setSsoLoading(false));
      }
    }
  }, [loginWithSso]);

  const handleSsoClick = () => {
    setErrorMessage('');
    if (!ssoClientId) {
      setErrorMessage(
        'Integrasi SSO telah siap, namun Client ID dan Secret belum dikonfigurasi di menu Pengaturan Keamanan. Silakan isi Client ID terlebih dahulu atau gunakan username & kata sandi.'
      );
      return;
    }

    const issuer = ssoIssuer || 'https://accounts.google.com';
    const redirectUri = window.location.origin + '/login';
    const authUrl = `${issuer}/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      ssoClientId
    )}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=openid%20email%20profile`;

    window.location.href = authUrl;
  };

  useEffect(() => {
    const reason = searchParams.get('reason');
    if (reason === 'inactive') {
      setErrorMessage('Akun Anda telah dinonaktifkan oleh administrator. Anda otomatis dikeluarkan dari sistem.');
    } else if (reason === 'session_timeout') {
      setErrorMessage('Sesi antarmuka Anda telah berakhir karena tidak ada aktivitas. Silakan masuk kembali.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal masuk. Periksa kembali username dan kata sandi Anda.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FEF7EC]">
      <header className="bg-[#8A001A] text-white px-4 sm:px-6 py-3 flex items-center justify-between gap-3 shadow-md relative z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center p-1 shadow-sm shrink-0">
            {/* Logo dan nama instansi diambil dari Pengaturan. */}
            <img
              src={logoUrl}
              alt={`Logo ${institutionName}`}
              width={44}
              height={44}
              onError={() => setLogoUrl('/seamolec-logo.png')}
              className="w-full h-full object-contain"
            />
          </div>
          <span className={`${wordmarkFont.className} text-2xl sm:text-[28px] leading-none tracking-[0.06em] text-white uppercase truncate`}>
            {institutionName}
          </span>
        </div>

        <div className="hidden sm:flex bg-white text-gray-800 rounded-full px-4 py-1.5 items-center text-sm font-medium shadow-sm gap-2 border border-gray-100 shrink-0">
          <Clock className="w-4 h-4 text-gray-500" aria-hidden="true" />
          <span>{currentDateTime || 'Memuat waktu...'}</span>
        </div>
      </header>

      <main className="flex-1 relative flex items-center justify-center p-4 sm:p-6 overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-full md:w-1/2 pointer-events-none select-none z-0">
          <img
            src="/building-bg.png"
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover object-center opacity-90 md:opacity-100"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#FEF7EC] via-[#FEF7EC]/70 md:via-transparent to-transparent" />
        </div>

        {/* Bingkai maroon dan bayangan tebal sama dengan kartu form tamu. */}
        <div className="relative z-10 w-full max-w-md bg-white rounded-[24px] sm:rounded-[28px] border-[3px] border-[#650015] shadow-[0_8px_0_0_#650015] p-8">
          <div className="text-center mb-7">
            <h1 className="text-xl font-extrabold text-[#3B0A11] tracking-tight">Login</h1>
          </div>

          {errorMessage && (
            <div role="alert" className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-username" className="block text-xs font-semibold text-gray-800 mb-1.5">
                Username atau Email
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  id="login-username"
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username atau email"
                  className="w-full bg-gray-50/50 border border-gray-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30 focus:border-[#8A001A] transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-semibold text-gray-800 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="w-full bg-gray-50/50 border border-gray-300 rounded-xl pl-10 pr-10 py-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30 focus:border-[#8A001A] transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-500 hover:text-gray-700 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A001A]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-[#8A001A] hover:bg-[#700015] active:bg-[#5A0011] text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#8A001A]"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
                  <span>Memproses...</span>
                </>
              ) : (
                <span>Masuk ke Sistem</span>
              )}
            </button>
          </form>

          {/* Login Google sungguhan dari tim backend; hanya tampil kalau SSO diaktifkan admin di Pengaturan. */}
          {ssoEnabled && (
            <>
              <div className="my-5 flex items-center gap-3 text-xs text-gray-500" aria-hidden="true">
                <span className="h-px flex-1 bg-gray-200" />
                atau
                <span className="h-px flex-1 bg-gray-200" />
              </div>

              <button
                type="button"
                onClick={handleSsoClick}
                disabled={ssoLoading}
                className="w-full py-2.5 px-4 bg-white hover:bg-gray-50 active:bg-gray-100 border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A001A]"
              >
                {ssoLoading ? (
                  <div className="w-4 h-4 border-2 border-gray-800 border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
                ) : (
                  <GoogleLogo />
                )}
                <span>{ssoLoading ? 'Memverifikasi akun Google...' : 'Masuk dengan Google'}</span>
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FEF7EC]" />}>
      <LoginForm />
    </Suspense>
  );
}
