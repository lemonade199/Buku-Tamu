'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'next/navigation';
import { User, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

function LoginForm() {
  const { login, loginWithSso } = useAuth();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [institutionName, setInstitutionName] = useState('SEAMOLEC');
  const [logoUrl, setLogoUrl] = useState('/seamolec-logo.jpg');
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
    <div className="relative min-h-screen flex items-center justify-center bg-[#FAF7F0] px-4">
      <div className="absolute inset-0 bg-gradient-to-tr from-[#8A001A]/10 via-[#FAF7F0] to-[#8A001A]/5 pointer-events-none" />

      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-200 p-8 z-10">
        <div className="flex flex-col items-center text-center mb-7">
          <div className="w-16 h-16 rounded-full bg-white p-1 border-2 border-[#8A001A] shadow-md mb-3 flex items-center justify-center overflow-hidden">
            <img
              src={logoUrl}
              alt={`${institutionName} Logo`}
              onError={() => setLogoUrl('/seamolec-logo.jpg')}
              className="w-full h-full object-contain rounded-full"
            />
          </div>
          <h2 className="text-xl font-extrabold text-[#3B0A11] tracking-tight">
            Sistem Buku Tamu Digital
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Masuk untuk mengakses portal {institutionName}
          </p>
        </div>

        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-2 text-xs text-red-700 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-800 mb-1.5">
              Username atau Email
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username atau email"
                className="w-full bg-gray-50/50 border border-gray-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30 focus:border-[#8A001A] transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-800 mb-1.5">
              Kata Sandi
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
                className="w-full bg-gray-50/50 border border-gray-300 rounded-xl pl-10 pr-10 py-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30 focus:border-[#8A001A] transition-all font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-[#8A001A] hover:bg-[#700015] text-white text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <span>Masuk ke Sistem</span>
            )}
          </button>

          {ssoEnabled && (
            <>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-[11px] uppercase">
                  <span className="bg-white px-3 text-gray-500 font-medium tracking-wide">
                    atau masuk dengan
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSsoClick}
                disabled={ssoLoading}
                className="w-full py-2.5 px-4 bg-white hover:bg-gray-50 text-gray-800 text-xs font-semibold rounded-xl border border-gray-300 shadow-2xs transition-all flex items-center justify-center space-x-2.5 cursor-pointer disabled:opacity-50"
              >
                {ssoLoading ? (
                  <div className="w-4 h-4 border-2 border-gray-800 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>{ssoLoading ? 'Memverifikasi SSO...' : 'Masuk dengan Akun Google / SSO'}</span>
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF7F0]" />}>
      <LoginForm />
    </Suspense>
  );
}
