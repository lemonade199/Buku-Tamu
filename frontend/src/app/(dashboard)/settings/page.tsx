'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Settings, ShieldAlert, ArrowLeft } from 'lucide-react';

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && user.role_code !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="py-12 text-center text-xs text-gray-500 font-medium">
        Memeriksa hak akses administrator...
      </div>
    );
  }

  if (user && user.role_code !== 'ADMIN') {
    return (
      <div className="max-w-md mx-auto mt-12 p-6 bg-white rounded-2xl border border-rose-200 shadow-sm text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-gray-900">Akses Terbatas</h2>
        <p className="text-xs text-gray-600 leading-relaxed">
          Halaman Pengaturan hanya dapat diakses oleh Administrator Sistem.
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

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Pengaturan Sistem</h1>
        <p className="text-xs text-gray-600 mt-0.5">
          Konfigurasi dan preferensi operasional institusi khusus Administrator
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/80 p-8 shadow-2xs text-center max-w-lg mx-auto space-y-4 mt-8">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
          <Settings className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900">Fitur Dalam Pengembangan</h2>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            Halaman Pengaturan telah dibatasi dan hanya dapat diakses oleh Administrator. Isi modul ini belum diaktifkan saat ini.
          </p>
        </div>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
}
