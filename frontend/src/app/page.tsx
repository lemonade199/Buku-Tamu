'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { resolveServerUrl } from '@/lib/api';
import { guestCheckinSchema } from '@/lib/validation/guestForm';
import { Lobster, Questrial } from 'next/font/google';
import { Camera, Clock, RefreshCw, CheckCircle2, AlertCircle, X, Hourglass, CreditCard } from 'lucide-react';
const wordmarkFont = Questrial({ weight: '400', subsets: ['latin'], display: 'swap' });

const welcomeFont = Lobster({ weight: '400', subsets: ['latin'], display: 'swap' });

const WELCOME_SECONDS = 10;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

interface PassOption {
  id_pass: number;
  no_pass: string;
  slot?: string;
  status: string;
}

interface RegistrationResult {
  fullname: string;
  no_pass?: string;
}

export default function KioskCheckinPage() {
  const [currentDateTime, setCurrentDateTime] = useState<string>('');
  const [institutionName, setInstitutionName] = useState('seamolec');
  const [institutionLogo, setInstitutionLogo] = useState('/seamolec-logo.png');
  const [openingTime, setOpeningTime] = useState('07:30');
  const [closingTime, setClosingTime] = useState('16:00');
  const [isOperationalOpen, setIsOperationalOpen] = useState(true);

  const [fullname, setFullname] = useState('');
  const [institution, setInstitution] = useState('');
  const [purpose, setPurpose] = useState('');
  const [availablePasses, setAvailablePasses] = useState<PassOption[]>([]);
  const [loadingPasses, setLoadingPasses] = useState(true);
  const [passError, setPassError] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [registrationResult, setRegistrationResult] = useState<RegistrationResult | null>(null);
  const [countdown, setCountdown] = useState(WELCOME_SECONDS);

  const checkOperationalStatus = (openStr: string, closeStr: string) => {
    try {
      const now = new Date();
      const cleanOpen = (openStr || '07:30').replace('.', ':');
      const cleanClose = (closeStr || '16:00').replace('.', ':');
      const [openH, openM] = cleanOpen.split(':').map(Number);
      const [closeH, closeM] = cleanClose.split(':').map(Number);

      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const openMinutes = openH * 60 + (openM || 0);
      const closeMinutes = closeH * 60 + (closeM || 0);

      if (openMinutes <= closeMinutes) {
        return nowMinutes >= openMinutes && nowMinutes <= closeMinutes;
      } else {
        return nowMinutes >= openMinutes || nowMinutes <= closeMinutes;
      }
    } catch {
      return true;
    }
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

      const dayName = days[now.getDay()];
      const day = String(now.getDate()).padStart(2, '0');
      const monthName = months[now.getMonth()];
      const year = now.getFullYear();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');

      setCurrentDateTime(`${dayName}, ${day} ${monthName} ${year} · ${hours}:${minutes}`);
      setIsOperationalOpen(checkOperationalStatus(openingTime, closingTime));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    const fetchPublicSettings = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/settings/public`);
        if (res.data?.success && res.data?.data) {
          if (res.data.data.institution_name) setInstitutionName(res.data.data.institution_name);
          if (res.data.data.logo_url) setInstitutionLogo(resolveServerUrl(res.data.data.logo_url) || '/seamolec-logo.png');
          const oTime = res.data.data.opening_time || '07:30';
          const cTime = res.data.data.closing_time || '16:00';
          setOpeningTime(oTime);
          setClosingTime(cTime);
          setIsOperationalOpen(checkOperationalStatus(oTime, cTime));
        }
      } catch {
        // Fallback to default
      }
    };
    fetchPublicSettings();

    return () => clearInterval(interval);
  }, [openingTime, closingTime]);

  // Hanya untuk menampilkan jumlah kartu tersedia. Nomor kartu dipilih backend saat permohonan dikirim.
  const fetchPasses = useCallback(async () => {
    setLoadingPasses(true);
    setPassError(false);
    try {
      const res = await axios.get<{ success: boolean; data: PassOption[] }>(`${API_BASE_URL}/pass/available`);
      setAvailablePasses(res.data.data || []);
    } catch (err) {
      console.error('Gagal mengambil pass tersedia:', err);
      setPassError(true);
    } finally {
      setLoadingPasses(false);
    }
  }, []);

  useEffect(() => {
    fetchPasses();
  }, [fetchPasses]);

  const startCamera = async () => {
    setCameraError(null);
    setCapturedPhoto(null);
    setIsVideoPlaying(false);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser tidak mendukung akses kamera.');
      }

      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } catch {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      setStream(mediaStream);
      setIsCameraOpen(true);
    } catch (err: any) {
      console.error('Camera access error:', err);
      let errorMsg = 'Tidak dapat mengakses kamera. Pastikan izin kamera aktif.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Akses kamera ditolak. Berikan izin webcam pada browser Anda.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'Tidak ditemukan perangkat webcam pada komputer ini.';
      }
      setCameraError(errorMsg);
      setIsCameraOpen(false);
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
    setIsVideoPlaying(false);
  }, [stream]);

  const setVideoElement = useCallback(
    (node: HTMLVideoElement | null) => {
      videoRef.current = node;
      if (node && stream) {
        node.srcObject = stream;
        node
          .play()
          .then(() => setIsVideoPlaying(true))
          .catch((e) => console.warn('Video auto-play interrupted:', e));
      }
    },
    [stream]
  );

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const captureSnapshot = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedPhoto(dataUrl);
    stopCamera();
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  const handleResetForNextVisitor = useCallback(() => {
    setRegistrationResult(null);
    setFullname('');
    setInstitution('');
    setPurpose('');
    setCapturedPhoto(null);
    setFormError('');
    stopCamera();
    fetchPasses();
  }, [stopCamera, fetchPasses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!isOperationalOpen) {
      setFormError(`Pendaftaran tamu mandiri saat ini ditutup di luar jam operasional (${openingTime} - ${closingTime} WIB). Silakan hubungi petugas resepsionis di meja informasi.`);
      return;
    }

    const parsed = guestCheckinSchema.safeParse({
      fullname,
      institution,
      purpose,
      photo_base64: capturedPhoto ?? undefined,
    });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0].message);
      return;
    }

    setSubmitting(true);
    try {
      // no_pass sengaja tidak dikirim: backend mengambil kartu AVAILABLE pertama dengan row lock.
      const res = await axios.post(`${API_BASE_URL}/visitors/checkin`, parsed.data);

      setRegistrationResult({
        fullname: res.data.data.fullname,
        no_pass: res.data.data.no_pass,
      });
    } catch (err: any) {
      console.error('Registration error:', err);
      const msg = err.response?.data?.message || 'Gagal memproses registrasi. Silakan coba kembali.';
      setFormError(msg);
      fetchPasses();
    } finally {
      setSubmitting(false);
    }
  };

  // Layar sambutan hanya tampil sebentar agar kiosk segera siap untuk tamu berikutnya di antrean.
  useEffect(() => {
    if (!registrationResult) return;

    setCountdown(WELCOME_SECONDS);
    const tick = setInterval(() => setCountdown((prev) => Math.max(prev - 1, 0)), 1000);
    const backToForm = setTimeout(handleResetForNextVisitor, WELCOME_SECONDS * 1000);

    return () => {
      clearInterval(tick);
      clearTimeout(backToForm);
    };
  }, [registrationResult, handleResetForNextVisitor]);

  const noPassAvailable = !loadingPasses && !passError && availablePasses.length === 0;
  const inputClass =
    'w-full bg-[#FAF7F0] border border-[#D5CEC5] rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#650015]/20 focus:border-[#650015]';
  const darkButtonClass =
    'bg-[#650015] hover:bg-[#80001B] active:bg-[#4F0011] text-white rounded-full py-2 px-5 text-sm font-semibold inline-flex items-center gap-2 shadow transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#650015]';

  return (
    <div className="min-h-screen flex flex-col bg-[#FEF7EC]">
      <header className="bg-[#8A001A] text-white px-4 sm:px-6 py-3 flex items-center justify-between gap-3 shadow-md relative z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center p-1 shadow-sm shrink-0">
            <img
              src={institutionLogo}
              alt={`Logo ${institutionName}`}
              width={44}
              height={44}
              onError={() => setInstitutionLogo('/seamolec-logo.png')}
              className="w-full h-full object-contain"
            />
          </div>
          <span className={`${wordmarkFont.className} text-2xl sm:text-[28px] leading-none tracking-[0.06em] text-white uppercase truncate`}>
            {institutionName}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
              isOperationalOpen
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                : 'bg-rose-100 text-rose-900 border border-rose-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${isOperationalOpen ? 'bg-emerald-500' : 'bg-rose-600'}`}
              aria-hidden="true"
            />
            <span>{isOperationalOpen ? `Buka (${openingTime} - ${closingTime})` : `Tutup (${openingTime} - ${closingTime})`}</span>
          </span>

          <div className="hidden sm:flex bg-white text-gray-800 rounded-full px-4 py-1.5 items-center text-sm font-medium shadow-sm gap-2 border border-gray-100">
            <Clock className="w-4 h-4 text-gray-500" aria-hidden="true" />
            <span>{currentDateTime || 'Memuat waktu...'}</span>
          </div>
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

        {registrationResult ? (
          <div className="relative z-10 w-full max-w-[640px] flex flex-col items-center animate-fadeIn">
            <div
              role="status"
              aria-live="polite"
              className="relative w-full bg-[#750019] rounded-[26px] border-[3px] border-[#3F000D] shadow-[0_12px_0_0_#3F000D] px-8 py-10 sm:px-14 sm:py-12 text-white text-center space-y-5"
            >
              <button
                type="button"
                onClick={handleResetForNextVisitor}
                className="absolute top-4 right-4 text-white/80 hover:text-white active:bg-white/20 p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Tutup dan kembali ke formulir"
              >
                <X className="w-6 h-6" aria-hidden="true" />
              </button>

              <div className="w-16 h-16 rounded-full bg-amber-400/20 border-2 border-amber-300 mx-auto flex items-center justify-center animate-pulse motion-reduce:animate-none">
                <Hourglass className="w-8 h-8 text-amber-300" aria-hidden="true" />
              </div>

              <h2 className={`${welcomeFont.className} text-4xl sm:text-5xl text-white`}>Selamat datang</h2>

              <div className="bg-white/10 rounded-2xl p-4 border border-white/15 text-left text-xs sm:text-sm space-y-2">
                <div className="flex justify-between gap-4 border-b border-white/10 pb-1.5">
                  <span className="text-white/70 shrink-0">Nama Tamu:</span>
                  <span className="font-bold text-white text-right break-words">{registrationResult.fullname}</span>
                </div>
                <div className="flex justify-between items-center pt-0.5">
                  <span className="text-white/70">Nomor Kartu Pass:</span>
                  <span className="font-mono font-bold text-amber-300 bg-black/40 px-2 py-0.5 rounded">
                    #{registrationResult.no_pass}
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-black/30 rounded-xl border border-white/10 text-sm text-white/90 leading-relaxed text-left flex items-center gap-2.5">
                <CreditCard className="w-5 h-5 text-amber-300 shrink-0" aria-hidden="true" />
                <span>Silakan mengambil kartu pass di resepsionis :)</span>
              </div>

              <p className="text-xs text-white/75">Kembali ke formulir dalam {countdown} detik</p>
            </div>
          </div>
        ) : (
          <div className="relative z-10 w-full max-w-[880px]">
            <div className="w-full bg-white rounded-[24px] sm:rounded-[28px] border-[3px] border-[#650015] shadow-[0_8px_0_0_#650015] p-5 sm:p-7">
              <h1 className="text-center font-serif text-2xl sm:text-[28px] text-[#222222] tracking-wide mb-4 lowercase">
                form input data tamu
              </h1>

              {!isOperationalOpen && (
                <div className="mb-4 p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs sm:text-sm text-amber-900 flex items-start space-x-2.5">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Layanan Penerimaan Tamu Tutup:</span> Saat ini di luar jam operasional ({openingTime} - {closingTime} WIB). Jika Anda memiliki janji temu dinas khusus, silakan konfirmasi langsung ke petugas resepsionis di lobi.
                  </div>
                </div>
              )}

              {formError && (
                <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" aria-hidden="true" />
                  <span>{formError}</span>
                </div>
              )}

              <canvas ref={canvasRef} className="hidden" />

              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-[300px_minmax(0,1fr)] gap-5 md:gap-7">
                {/* Kolom kiri: foto. Bingkai 4:3 tetap supaya tinggi kartu tidak berubah saat kamera dibuka. */}
                <div className="flex flex-col items-center gap-3">
                  <div className="relative w-full max-w-[300px] aspect-[4/3] rounded-2xl overflow-hidden bg-[#D9D9D9]">
                    {capturedPhoto ? (
                      <>
                        <img src={capturedPhoto} alt="Foto tamu yang sudah diambil" className="w-full h-full object-cover" />
                        <div className="absolute top-2 right-2 bg-emerald-600 text-white rounded-full p-1 shadow">
                          <CheckCircle2 className="w-4 h-4" aria-label="Foto sudah diambil" />
                        </div>
                      </>
                    ) : isCameraOpen ? (
                      <>
                        <video
                          ref={setVideoElement}
                          autoPlay
                          playsInline
                          muted
                          onLoadedMetadata={(e) => {
                            const v = e.currentTarget;
                            v.play().then(() => setIsVideoPlaying(true)).catch(console.warn);
                          }}
                          className="w-full h-full object-cover -scale-x-100 bg-black"
                        />
                        {!isVideoPlaying && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 text-white gap-2 pointer-events-none">
                            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
                            <span className="text-xs font-medium">Menghubungkan webcam...</span>
                          </div>
                        )}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                          <div className="w-28 h-36 rounded-[50%] border-2 border-dashed border-white/70" />
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 px-4 text-center text-gray-700">
                        <Camera className="w-8 h-8 text-gray-600" aria-hidden="true" />
                        <span className="text-sm">Foto wajah wajib diambil</span>
                      </div>
                    )}
                  </div>

                  {capturedPhoto ? (
                    <button type="button" onClick={handleRetake} className={darkButtonClass}>
                      <RefreshCw className="w-4 h-4" aria-hidden="true" />
                      <span>Ambil Foto Ulang</span>
                    </button>
                  ) : isCameraOpen ? (
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={captureSnapshot} className={darkButtonClass}>
                        <Camera className="w-4 h-4" aria-hidden="true" />
                        <span>Jepret Foto</span>
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white rounded-full p-2.5 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-600"
                        aria-label="Tutup kamera"
                      >
                        <X className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={startCamera} className={darkButtonClass}>
                      <Camera className="w-4 h-4" aria-hidden="true" />
                      <span>Buka Kamera</span>
                    </button>
                  )}

                  {cameraError && (
                    <p role="alert" className="text-xs text-red-700 font-medium max-w-[300px] text-center">
                      {cameraError}
                    </p>
                  )}
                </div>

                {/* Kolom kanan: data diri dan tombol kirim. */}
                <div className="flex flex-col gap-3">
                  <div>
                    <label htmlFor="guest-fullname" className="block font-serif italic text-sm text-[#222222] mb-1">
                      Nama Tamu <span className="text-[#650015]"></span>
                    </label>
                    <input
                      id="guest-fullname"
                      type="text"
                      required
                      autoComplete="name"
                      value={fullname}
                      onChange={(e) => setFullname(e.target.value)}
                      placeholder="Masukkan nama lengkap Anda"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="guest-institution" className="block font-serif italic text-sm text-[#222222] mb-1">
                      Instansi 
                    </label>
                    <input
                      id="guest-institution"
                      type="text"
                      autoComplete="organization"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      placeholder="Nama instansi"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="guest-purpose" className="block font-serif italic text-sm text-[#222222] mb-1">
                      Keperluan Kunjungan
                    </label>
                    <input
                      id="guest-purpose"
                      type="text"
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      placeholder="Tujuan kunjungan Anda"
                      className={inputClass}
                    />
                  </div>

                  <div
                    aria-live="polite"
                    className={`rounded-xl px-4 py-2.5 text-sm border ${
                      noPassAvailable ? 'bg-red-50 border-red-200 text-red-700' : 'bg-[#FAF7F0] border-[#D5CEC5] text-gray-700'
                    }`}
                  >
                    <p className="font-serif italic text-sm text-[#222222] mb-1">Kartu Pass</p>
                    {loadingPasses ? (
                      'Memeriksa ketersediaan kartu pass...'
                    ) : passError ? (
                      <span className="flex flex-wrap items-center gap-x-2">
                        Jumlah kartu pass belum bisa dimuat.
                        <button
                          type="button"
                          onClick={fetchPasses}
                          className="font-semibold text-[#650015] underline underline-offset-2 hover:text-[#80001B] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#650015] rounded"
                        >
                          Muat ulang
                        </button>
                      </span>
                    ) : noPassAvailable ? (
                      'Kartu pass sedang habis. Silakan hubungi meja resepsionis.'
                    ) : (
                      <>
                        <strong className="text-[#650015]">{availablePasses.length} kartu</strong> tersedia. 
                      </>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || loadingPasses || noPassAvailable}
                    className="mt-1 w-full py-3 bg-[#650015] hover:bg-[#80001B] active:bg-[#4F0011] text-white font-bold text-sm rounded-full shadow-[0_4px_0_0_#3F000D] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#650015]"
                  >
                    {submitting ? 'Mengirim permohonan...' : 'Kirim Permohonan Registrasi'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
