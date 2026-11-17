'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { User, Lock, Eye, EyeOff, Building2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin123!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal masuk. Periksa kembali username dan password Anda.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-ivory-100 px-4">
      {/* Blurred background decoration */}
      <div className="absolute inset-0 bg-gradient-to-tr from-brand-950/15 via-ivory-50/70 to-brand-500/10 backdrop-blur-[2px] pointer-events-none" />

      {/* Main Login Card */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-ivory-200 p-8 z-10">
        {/* Top Header */}
        <div className="flex flex-col items-center text-center mb-7">
          <div className="w-14 h-14 rounded-2xl bg-brand-500 text-white flex items-center justify-center shadow-md mb-3">
            <Building2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-charcoal tracking-tight">
            Sistem Buku Tamu Digital
          </h2>
          <p className="text-xs text-charcoal-muted mt-1">
            Masuk untuk mengakses layanan resepsionis & operasional
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-2 text-xs text-red-700 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Input */}
          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1.5">
              Username atau Email
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-charcoal-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username atau email"
                className="w-full bg-ivory-50/50 border border-ivory-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1.5">
              Kata Sandi
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-charcoal-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
                className="w-full bg-ivory-50/50 border border-ivory-200 rounded-xl pl-10 pr-10 py-2.5 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-charcoal-muted hover:text-charcoal"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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
        </form>

        {/* Quick Demo Credentials Helper */}
        <div className="mt-6 pt-5 border-t border-ivory-200 text-center">
          <p className="text-[11px] font-medium text-charcoal-muted mb-2">
            Akun Bawaan Sistem (Demo):
          </p>
          <div className="flex justify-center space-x-2">
            <button
              type="button"
              onClick={() => { setUsername('admin'); setPassword('Admin123!'); }}
              className="px-2.5 py-1 bg-ivory-100 hover:bg-ivory-200 text-[11px] text-brand-900 rounded-lg font-medium transition-colors"
            >
              Admin (<span className="font-mono">admin</span>)
            </button>
            <button
              type="button"
              onClick={() => { setUsername('petugas'); setPassword('Petugas123!'); }}
              className="px-2.5 py-1 bg-ivory-100 hover:bg-ivory-200 text-[11px] text-brand-900 rounded-lg font-medium transition-colors"
            >
              Petugas (<span className="font-mono">petugas</span>)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
