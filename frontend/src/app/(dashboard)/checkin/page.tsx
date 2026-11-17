'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { PassItem } from '@/types';
import WebcamCapture from '@/components/WebcamCapture';
import PassSelector from '@/components/PassSelector';
import CheckinSuccessModal from '@/components/CheckinSuccessModal';
import { User, Phone, Building, Briefcase, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

export default function CheckinPage() {
  const [fullname, setFullname] = useState('');
  const [telephone, setTelephone] = useState('');
  const [institution, setInstitution] = useState('');
  const [representing, setRepresenting] = useState('');
  const [purpose, setPurpose] = useState('');

  const [availablePasses, setAvailablePasses] = useState<PassItem[]>([]);
  const [selectedPassNo, setSelectedPassNo] = useState<string | null>(null);
  const [loadingPasses, setLoadingPasses] = useState(true);

  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [checkinResult, setCheckinResult] = useState<any>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Fetch available passes
  const fetchPasses = async () => {
    setLoadingPasses(true);
    try {
      const res = await api.get<{ success: boolean; data: PassItem[] }>('/pass/available');
      const passes = res.data.data;
      setAvailablePasses(passes);
      if (passes.length > 0 && !selectedPassNo) {
        setSelectedPassNo(passes[0].no_pass);
      }
    } catch (err) {
      console.error('Gagal mengambil daftar pass:', err);
    } finally {
      setLoadingPasses(false);
    }
  };

  useEffect(() => {
    fetchPasses();
  }, []);

  const handleResetForm = () => {
    setFullname('');
    setTelephone('');
    setInstitution('');
    setRepresenting('');
    setPurpose('');
    setPhotoBase64(null);
    setErrorMessage('');
    setShowSuccessModal(false);
    setCheckinResult(null);
    fetchPasses();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!photoBase64) {
      setErrorMessage('Foto pengunjung wajib diambil melalui kamera sebelum check-in.');
      return;
    }

    if (!selectedPassNo) {
      setErrorMessage('Silakan pilih salah satu kartu pass yang tersedia di rak.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/visitors/checkin', {
        fullname,
        telephone,
        institution,
        representing,
        purpose,
        no_pass: selectedPassNo,
        photo_base64: photoBase64,
      });

      setCheckinResult(res.data.data);
      setShowSuccessModal(true);
    } catch (err: any) {
      console.error('Checkin error:', err);
      const msg = err.response?.data?.message || 'Gagal memproses check-in pengunjung. Periksa data kembali.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Title */}
      <div>
        <h2 className="text-xl font-bold text-charcoal tracking-tight">Registrasi & Check-In Pengunjung</h2>
        <p className="text-xs text-charcoal-muted mt-0.5">
          Lengkapi formulir data tamu, ambil foto verifikasi wajah, dan alokasikan kartu pass fisik
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-2.5 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Split Layout: Form on Left, Camera on Right (sesuai acuan Figma Screen 3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Details */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-ivory-200 p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-sm font-bold text-charcoal pb-2 border-b border-ivory-200">
              Data Identitas Pengunjung
            </h3>

            {/* Nama Lengkap */}
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
                  placeholder="Contoh: Budi Santoso"
                  className="w-full bg-ivory-50/50 border border-ivory-200 rounded-xl pl-9 pr-3 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                />
              </div>
            </div>

            {/* Telepon & Instansi (Grid 2 Kolom) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1">
                  Nomor Telepon / WhatsApp <span className="text-brand-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-charcoal-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="w-full bg-ivory-50/50 border border-ivory-200 rounded-xl pl-9 pr-3 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
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
                    placeholder="Contoh: PT Bangun Mandiri"
                    className="w-full bg-ivory-50/50 border border-ivory-200 rounded-xl pl-9 pr-3 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                  />
                </div>
              </div>
            </div>

            {/* Pihak yang Dikunjungi */}
            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">
                Pihak / Bagian yang Dikunjungi <span className="text-brand-500">*</span>
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 text-charcoal-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={representing}
                  onChange={(e) => setRepresenting(e.target.value)}
                  placeholder="Contoh: Ibu Rina (Divisi Keuangan)"
                  className="w-full bg-ivory-50/50 border border-ivory-200 rounded-xl pl-9 pr-3 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                />
              </div>
            </div>

            {/* Keperluan */}
            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">
                Keperluan / Tujuan Kunjungan
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-charcoal-muted absolute left-3 top-3" />
                <textarea
                  rows={2}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Keterangan singkat tujuan kedatangan..."
                  className="w-full bg-ivory-50/50 border border-ivory-200 rounded-xl pl-9 pr-3 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                />
              </div>
            </div>

            {/* Pass Selector Grid */}
            <div className="pt-2">
              <PassSelector
                availablePasses={availablePasses}
                selectedPassNo={selectedPassNo}
                onSelectPass={(no) => setSelectedPassNo(no)}
                loading={loadingPasses}
              />
            </div>

            {/* Submit Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={submitting || !photoBase64 || !selectedPassNo}
                className="w-full py-3.5 px-4 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Menyimpan Kunjungan...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {photoBase64
                        ? `Selesaikan Check-In & Berikan Pass #${selectedPassNo || '...'}`
                        : 'Ambil Foto Tamu Terlebih Dahulu'}
                    </span>
                  </>
                )}
              </button>
              {!photoBase64 && (
                <p className="text-[11px] text-center text-amber-700 mt-2 font-medium">
                  ⚠️ Tombol check-in akan aktif setelah foto pengunjung berhasil diambil melalui kamera di sebelah kanan.
                </p>
              )}
            </div>
          </form>
        </div>

        {/* Right Column: Camera Capture Component */}
        <div className="lg:col-span-5">
          <WebcamCapture
            onPhotoConfirmed={(photo) => {
              setPhotoBase64(photo);
              setErrorMessage('');
            }}
            onPhotoCleared={() => setPhotoBase64(null)}
          />
        </div>
      </div>

      {/* Success Modal */}
      <CheckinSuccessModal
        isOpen={showSuccessModal}
        result={checkinResult}
        onReset={handleResetForm}
      />
    </div>
  );
}
