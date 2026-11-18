'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { User, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
      const msg = err.response?.data?.message || 'Gagal masuk. Periksa kembali username dan kata sandi Anda.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#FAF7F0] px-4">
      {/* Blurred background decoration */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#8A001A]/10 via-[#FAF7F0] to-[#8A001A]/5 pointer-events-none" />

      {/* Main Login Card */}
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-200 p-8 z-10">
        {/* Top Header */}
        <div className="flex flex-col items-center text-center mb-7">
          <div className="w-16 h-16 rounded-full bg-white p-1 border-2 border-[#8A001A] shadow-md mb-3 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/seamolec-logo.jpg"
              alt="SEAMOLEC Logo"
              className="w-full h-full object-contain rounded-full"
            />
          </div>
          <h2 className="text-xl font-extrabold text-[#3B0A11] tracking-tight">
            Sistem Buku Tamu Digital
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Masuk untuk mengakses portal resepsionis & operasional
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

          {/* Password Input */}
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

          {/* Submit Button */}
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
        </form>
      </div>
    </div>
  );
}
