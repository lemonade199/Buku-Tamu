'use client';

import React, { useState } from 'react';
import WebcamCapture from '@/components/WebcamCapture';
import { User, Phone, Building, Briefcase, FileText, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

interface VisitorRegistrationFormProps {
  onProceedToPassAllocation: (data: {
    fullname: string;
    telephone: string;
    institution?: string;
    representing?: string;
    purpose?: string;
    photoBase64: string;
  }) => void;
}

export default function VisitorRegistrationForm({
  onProceedToPassAllocation,
}: VisitorRegistrationFormProps) {
  const [fullname, setFullname] = useState('');
  const [telephone, setTelephone] = useState('');
  const [institution, setInstitution] = useState('');
  const [representing, setRepresenting] = useState('');
  const [purpose, setPurpose] = useState('');
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullname.trim()) {
      setError('Nama lengkap pengunjung wajib diisi.');
      return;
    }
    if (!telephone.trim()) {
      setError('Nomor telepon pengunjung wajib diisi.');
      return;
    }
    if (!representing.trim()) {
      setError('Pihak/bagian yang dikunjungi wajib diisi.');
      return;
    }
    if (!photoBase64) {
      setError('Foto pengunjung wajib diambil melalui kamera web sebelum melanjutkan.');
      return;
    }

    onProceedToPassAllocation({
      fullname: fullname.trim(),
      telephone: telephone.trim(),
      institution: institution.trim() || undefined,
      representing: representing.trim() || undefined,
      purpose: purpose.trim() || undefined,
      photoBase64,
    });
  };

  return (
    <div className="bg-white rounded-3xl border border-ivory-200 shadow-md p-6 lg:p-7 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-ivory-200">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 text-[11px] font-semibold mb-1">
            <Sparkles className="w-3 h-3 text-brand-500" />
            <span>Resepsionis Operasional</span>
          </div>
          <h3 className="text-base font-bold text-charcoal tracking-tight">
            Registrasi Pengunjung Langsung
          </h3>
          <p className="text-xs text-charcoal-muted">
            Catat identitas tamu dan ambil foto wajah (pemilihan kartu pass dilakukan pada langkah berikutnya)
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start space-x-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* 2-Column Split: Form Inputs on Left, Camera on Right */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Form Fields (Left) */}
          <div className="lg:col-span-7 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">
                Nama Lengkap Tamu <span className="text-brand-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-charcoal-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={fullname}
                  onChange={(e) => setFullname(e.target.value)}
                  placeholder="Masukkan nama lengkap pengunjung"
                  className="w-full bg-ivory-50/50 border border-ivory-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1">
                  Nomor Kontak / WhatsApp <span className="text-brand-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-charcoal-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="w-full bg-ivory-50/50 border border-ivory-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1">
                  Instansi / Perusahaan
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-charcoal-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="Contoh: PT Sumber Rejeki"
                    className="w-full bg-ivory-50/50 border border-ivory-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">
                Pihak yang Dituju / Bertemu Dengan <span className="text-brand-500">*</span>
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 text-charcoal-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={representing}
                  onChange={(e) => setRepresenting(e.target.value)}
                  placeholder="Contoh: Bagian Kepegawaian / Bpk. Hendra"
                  className="w-full bg-ivory-50/50 border border-ivory-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">
                Keperluan Kunjungan
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-charcoal-muted absolute left-3 top-3" />
                <textarea
                  rows={2}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Tuliskan tujuan atau keperluan kedatangan tamu..."
                  className="w-full bg-ivory-50/50 border border-ivory-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={!photoBase64}
                className="w-full py-3.5 px-4 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <span>Lanjutkan ke Pemilihan Kartu Pass</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              {!photoBase64 && (
                <p className="text-[11px] text-center text-amber-700 mt-2 font-medium">
                  ⚠️ Ambil foto wajah tamu di panel kamera sebelah kanan untuk melanjutkan.
                </p>
              )}
            </div>
          </div>

          {/* Camera Viewport (Right) */}
          <div className="lg:col-span-5">
            <WebcamCapture
              onPhotoConfirmed={(photo) => {
                setPhotoBase64(photo);
                setError('');
              }}
              onPhotoCleared={() => setPhotoBase64(null)}
            />
          </div>
        </div>
      </form>
    </div>
  );
}
