'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Camera, Clock, RefreshCw, CheckCircle2, AlertCircle, X, ShieldAlert, Hourglass, UserCheck, UserX } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

interface PassOption {
  id_pass: number;
  no_pass: string;
  slot?: string;
  status: string;
}

interface RegistrationStatusData {
  id_visitor: number;
  fullname: string;
  no_pass?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejection_reason?: string;
  approved_at?: string;
  rejected_at?: string;
  check_in_at?: string;
  is_active?: boolean;
}

export default function KioskCheckinPage() {
  const [currentDateTime, setCurrentDateTime] = useState<string>('');
  const [institutionName, setInstitutionName] = useState('seamolec');
  const [institutionLogo, setInstitutionLogo] = useState('/seamolec-logo.jpg');
  const [openingTime, setOpeningTime] = useState('07:30');
  const [closingTime, setClosingTime] = useState('16:00');
  const [isOperationalOpen, setIsOperationalOpen] = useState(true);

  const [fullname, setFullname] = useState('');
  const [institution, setInstitution] = useState('');
  const [purpose, setPurpose] = useState('');
  const [selectedPassNo, setSelectedPassNo] = useState<string>('');
  const [availablePasses, setAvailablePasses] = useState<PassOption[]>([]);
  const [loadingPasses, setLoadingPasses] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [registrationResult, setRegistrationResult] = useState<RegistrationStatusData | null>(null);
  const [countdown, setCountdown] = useState(15);

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
          if (res.data.data.logo_url) setInstitutionLogo(res.data.data.logo_url);
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

  const fetchPasses = useCallback(async () => {
    setLoadingPasses(true);
    try {
      const res = await axios.get<{ success: boolean; data: PassOption[] }>(`${API_BASE_URL}/pass/available`);
      const passes = res.data.data || [];
      setAvailablePasses(passes);
      if (passes.length > 0) {
        setSelectedPassNo(passes[0].no_pass);
      } else {
        setSelectedPassNo('');
      }
    } catch (err) {
      console.error('Gagal mengambil pass tersedia:', err);
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

    if (!fullname.trim()) {
      setFormError('Nama Tamu wajib diisi.');
      return;
    }

    if (!capturedPhoto) {
      setFormError('Foto pengunjung wajib diambil sebelum mendaftar.');
      return;
    }

    if (!selectedPassNo) {
      setFormError('Nomor pass belum dipilih atau sedang tidak tersedia.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/visitors/checkin`, {
        fullname: fullname.trim(),
        institution: institution.trim() || undefined,
        purpose: purpose.trim() || undefined,
        no_pass: selectedPassNo,
        photo_base64: capturedPhoto,
      });

      setRegistrationResult({
        id_visitor: res.data.data.id_visitor,
        fullname: res.data.data.fullname,
        no_pass: res.data.data.no_pass || selectedPassNo,
        status: 'PENDING',
      });
    } catch (err: any) {
      console.error('Registration error:', err);
      const msg = err.response?.data?.message || 'Gagal memproses registrasi. Silakan coba kembali.';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!registrationResult || registrationResult.status !== 'PENDING') return;

    const interval = setInterval(async () => {
      try {
        const res = await axios.get<{ success: boolean; data: RegistrationStatusData }>(
          `${API_BASE_URL}/visitors/${registrationResult.id_visitor}/status`
        );
        if (res.data.success && res.data.data) {
          const updated = res.data.data;
          if (updated.status !== 'PENDING') {
            setRegistrationResult(updated);
          }
        }
      } catch (err) {
        console.error('Polling status error:', err);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [registrationResult]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (registrationResult && registrationResult.status === 'APPROVED') {
      setCountdown(15);
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleResetForNextVisitor();
            return 15;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [registrationResult, handleResetForNextVisitor]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FEF7EC]">
      <header className="bg-[#8A001A] text-white px-6 py-3 flex items-center justify-between shadow-md relative z-20">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center p-0.5 shadow-sm overflow-hidden shrink-0">
            <img
              src={institutionLogo}
              alt={`${institutionName} Logo`}
              onError={() => setInstitutionLogo('/seamolec-logo.jpg')}
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans lowercase">
            {institutionName}
          </span>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          <span className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-xs ${
            isOperationalOpen
              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              : 'bg-rose-100 text-rose-900 border border-rose-300'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isOperationalOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-600'}`} />
            <span>{isOperationalOpen ? `Buka (${openingTime} - ${closingTime})` : `Tutup (${openingTime} - ${closingTime})`}</span>
          </span>

          <div className="bg-white text-gray-800 rounded-full px-4 py-1.5 flex items-center text-xs sm:text-sm font-medium shadow-sm space-x-2 border border-gray-100">
            <Clock className="w-4 h-4 text-gray-500" />
            <span>{currentDateTime || 'Memuat waktu...'}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 relative flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-full md:w-1/2 pointer-events-none select-none z-0">
          <img
            src="/building-bg.jpg"
            alt="SEAMOLEC Building"
            className="w-full h-full object-cover object-center opacity-90 md:opacity-100"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#FEF7EC] via-[#FEF7EC]/70 md:via-transparent to-transparent" />
        </div>

        {registrationResult ? (
          <div className="relative z-10 w-full max-w-[640px] flex flex-col items-center animate-fadeIn">
            {registrationResult.status === 'PENDING' && (
              <div className="relative w-full bg-[#750019] rounded-[26px] border-[3px] border-[#3F000D] shadow-[0_12px_0_0_#3F000D] px-8 py-10 sm:px-14 sm:py-12 text-white text-center space-y-5">
                <button
                  type="button"
                  onClick={handleResetForNextVisitor}
                  className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                  title="Tutup & kembali ke form"
                  aria-label="Tutup dan kembali ke form registrasi"
                >
                  <X className="w-6 h-6" />
                </button>

                <div className="w-16 h-16 rounded-full bg-amber-400/20 border-2 border-amber-300 mx-auto flex items-center justify-center animate-pulse">
                  <Hourglass className="w-8 h-8 text-amber-300" />
                </div>

                <div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    Registrasi Sedang Diproses
                  </h2>
                  <p className="font-serif italic text-base sm:text-lg text-amber-200 mt-1">
                    Menunggu Konfirmasi Resepsionis
                  </p>
                </div>

                <div className="bg-white/10 rounded-2xl p-4 border border-white/15 text-left text-xs sm:text-sm space-y-2">
                  <div className="flex justify-between border-b border-white/10 pb-1.5">
                    <span className="text-white/70">Nama Tamu:</span>
                    <span className="font-bold text-white">{registrationResult.fullname}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-1.5">
                    <span className="text-white/70">Nomor Kartu Pass:</span>
                    <span className="font-mono font-bold text-amber-300 bg-black/40 px-2 py-0.5 rounded">
                      #{registrationResult.no_pass}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-0.5">
                    <span className="text-white/70">Status Kartu:</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400 text-black">
                      PENDING
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-black/30 rounded-xl border border-white/10 text-xs text-white/90 leading-relaxed text-left flex items-start space-x-2.5">
                  <ShieldAlert className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
                  <span>
                    Kartu pass fisik belum boleh diambil atau digunakan. Mohon tunggu sejenak di dekat meja resepsionis hingga registrasi Anda diverifikasi.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleResetForNextVisitor}
                  className="w-full py-2.5 bg-white/15 hover:bg-white/25 text-white rounded-full text-xs font-semibold transition-colors cursor-pointer"
                >
                  Batalkan & Kembali ke Formulir
                </button>
              </div>
            )}

            {registrationResult.status === 'APPROVED' && (
              <div className="relative w-full bg-[#1B5E20] rounded-[26px] border-[3px] border-[#0A3910] shadow-[0_12px_0_0_#0A3910] px-8 py-10 sm:px-14 sm:py-12 text-white text-center space-y-4">
                <button
                  type="button"
                  onClick={handleResetForNextVisitor}
                  className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                  title="Tutup & kembali ke form"
                  aria-label="Tutup dan kembali ke form registrasi"
                >
                  <X className="w-6 h-6" />
                </button>

                <div className="w-16 h-16 rounded-full bg-emerald-400/20 border-2 border-emerald-300 mx-auto flex items-center justify-center">
                  <UserCheck className="w-9 h-9 text-emerald-300" />
                </div>

                <p className="font-serif italic text-2xl sm:text-3xl text-emerald-100 tracking-wide">
                  Selamat datang!
                </p>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Registrasi Disetujui
                </h2>

                <div className="bg-black/30 rounded-2xl p-4 border border-white/20 inline-block my-2">
                  <span className="block text-xs uppercase tracking-wider text-emerald-200">Nomor Kartu Pass Anda</span>
                  <span className="text-5xl sm:text-6xl font-black font-sans text-white tracking-wider block mt-1">
                    #{registrationResult.no_pass}
                  </span>
                </div>

                <p className="text-sm sm:text-base text-white/95 font-medium">
                  Kartu pass telah disetujui dan aktif (IN_USE). Silakan ambil kartu pass Anda di meja resepsionis dan selamat berkunjung ke SEAMOLEC.
                </p>

                <div className="pt-4 border-t border-white/20 flex flex-col items-center space-y-2">
                  <span className="text-xs text-white/80">
                    Kembali ke formulir otomatis dalam <strong className="font-mono text-white">{countdown}</strong> detik...
                  </span>
                  <div className="w-48 bg-white/20 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-white h-full rounded-full transition-all duration-1000 ease-linear"
                      style={{ width: `${(countdown / 15) * 100}%` }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleResetForNextVisitor}
                    className="mt-2 px-6 py-2 bg-white text-[#1B5E20] font-bold text-xs rounded-full shadow hover:bg-emerald-50 transition-colors cursor-pointer"
                  >
                    Selesai
                  </button>
                </div>
              </div>
            )}

            {registrationResult.status === 'REJECTED' && (
              <div className="relative w-full bg-[#8A001A] rounded-[26px] border-[3px] border-[#550010] shadow-[0_12px_0_0_#550010] px-8 py-10 sm:px-14 sm:py-12 text-white text-center space-y-4">
                <button
                  type="button"
                  onClick={handleResetForNextVisitor}
                  className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                  title="Tutup & kembali ke form"
                  aria-label="Tutup dan kembali ke form registrasi"
                >
                  <X className="w-6 h-6" />
                </button>

                <div className="w-16 h-16 rounded-full bg-rose-400/20 border-2 border-rose-300 mx-auto flex items-center justify-center">
                  <UserX className="w-9 h-9 text-rose-300" />
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Permohonan Belum Dapat Disetujui
                </h2>

                <div className="bg-black/35 rounded-2xl p-4 border border-rose-300/30 text-left space-y-2">
                  <span className="text-xs font-bold text-rose-200 uppercase tracking-wider block">
                    Alasan Penolakan:
                  </span>
                  <p className="text-sm font-semibold text-white bg-black/30 p-3 rounded-xl border border-white/10">
                    {registrationResult.rejection_reason || 'Mohon maaf, permohonan kunjungan Anda tidak dapat disetujui oleh resepsionis saat ini.'}
                  </p>
                  <p className="text-[11px] text-white/80">
                    Kartu pass nomor #{registrationResult.no_pass} telah dikembalikan ke status tersedia (AVAILABLE).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleResetForNextVisitor}
                  className="mt-2 w-full py-3 bg-white text-[#8A001A] font-bold text-xs sm:text-sm rounded-full shadow hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  Kembali ke Form Registrasi
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="relative z-10 w-full max-w-[880px] flex flex-col items-center space-y-4">
            <div className="w-full bg-white rounded-[24px] sm:rounded-[28px] border-[3px] border-[#650015] shadow-[0_10px_0_0_#650015] p-5 sm:p-8 transition-all">
              <h1 className="text-center font-serif text-2xl sm:text-[28px] text-[#222222] tracking-wide mb-5 lowercase">
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
                <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs sm:text-sm text-red-700 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="bg-[#D9D9D9] rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center relative overflow-hidden min-h-[220px] mb-6">
                <canvas ref={canvasRef} className="hidden" />

                {capturedPhoto ? (
                  <div className="flex flex-col items-center space-y-3">
                    <div className="relative w-44 h-32 rounded-xl overflow-hidden shadow border-2 border-white">
                      <img
                        src={capturedPhoto}
                        alt="Snapshot Tamu"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-1 right-1 bg-emerald-600 text-white rounded-full p-1 shadow">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRetake}
                      className="bg-[#650015] hover:bg-[#80001B] text-white rounded-full py-2 px-6 text-xs sm:text-sm font-medium flex items-center space-x-2 shadow transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#650015]"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Ambil Foto Ulang</span>
                    </button>
                  </div>
                ) : isCameraOpen ? (
                  <div className="flex flex-col items-center space-y-3 w-full max-w-sm">
                    <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-black shadow border-2 border-[#650015] flex items-center justify-center">
                      <video
                        ref={setVideoElement}
                        autoPlay
                        playsInline
                        muted
                        onLoadedMetadata={(e) => {
                          const v = e.currentTarget;
                          v.play().then(() => setIsVideoPlaying(true)).catch(console.warn);
                        }}
                        className="w-full h-full object-cover -scale-x-100"
                      />

                      {!isVideoPlaying && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 text-white space-y-2 pointer-events-none">
                          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs font-medium">Menghubungkan webcam...</span>
                        </div>
                      )}

                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-36 h-48 rounded-[50%] border-2 border-dashed border-white/70" />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={captureSnapshot}
                        className="bg-[#650015] hover:bg-[#80001B] text-white rounded-full py-2 px-6 text-xs sm:text-sm font-semibold flex items-center space-x-2 shadow-md transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#650015]"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Jepret Foto Sekarang</span>
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="bg-gray-600 hover:bg-gray-700 text-white rounded-full p-2 text-xs transition-all cursor-pointer"
                        title="Batal"
                        aria-label="Batalkan kamera"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-3">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="bg-[#650015] hover:bg-[#80001B] text-white rounded-full py-2.5 px-6 text-xs sm:text-sm font-semibold flex items-center space-x-2 shadow-md transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#650015]"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Buka Kamera Webcam</span>
                    </button>
                    {cameraError && (
                      <p className="text-xs text-red-600 font-medium max-w-xs text-center mt-1">
                        {cameraError}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="guest-fullname" className="block font-serif italic text-sm text-[#222222] mb-1">
                      Nama Tamu <span className="text-[#650015]">*</span>
                    </label>
                    <input
                      id="guest-fullname"
                      type="text"
                      required
                      value={fullname}
                      onChange={(e) => setFullname(e.target.value)}
                      placeholder="Masukkan nama lengkap Anda..."
                      className="w-full bg-[#FAF7F0] border border-[#D5CEC5] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#650015]/20 focus:border-[#650015]"
                    />
                  </div>

                  <div>
                    <label htmlFor="guest-institution" className="block font-serif italic text-sm text-[#222222] mb-1">
                      Instansi / Sekolah
                    </label>
                    <input
                      id="guest-institution"
                      type="text"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      placeholder="Nama instansi atau institusi..."
                      className="w-full bg-[#FAF7F0] border border-[#D5CEC5] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#650015]/20 focus:border-[#650015]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="guest-purpose" className="block font-serif italic text-sm text-[#222222] mb-1">
                      Keperluan Kunjungan
                    </label>
                    <input
                      id="guest-purpose"
                      type="text"
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      placeholder="Tujuan kunjungan Anda..."
                      className="w-full bg-[#FAF7F0] border border-[#D5CEC5] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#650015]/20 focus:border-[#650015]"
                    />
                  </div>

                  <div>
                    <label htmlFor="guest-pass" className="block font-serif italic text-sm text-[#222222] mb-1">
                      Pilih Kartu Pass Tersedia (AVAILABLE) <span className="text-[#650015]">*</span>
                    </label>
                    <select
                      id="guest-pass"
                      value={selectedPassNo}
                      onChange={(e) => setSelectedPassNo(e.target.value)}
                      disabled={loadingPasses || availablePasses.length === 0}
                      className="w-full bg-[#FAF7F0] border border-[#D5CEC5] rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#650015]/20 focus:border-[#650015] cursor-pointer disabled:opacity-50"
                    >
                      {loadingPasses ? (
                        <option value="">Memuat kartu pass tersedia...</option>
                      ) : availablePasses.length === 0 ? (
                        <option value="">Tidak ada kartu pass yang tersedia saat ini</option>
                      ) : (
                        availablePasses.map((pass) => (
                          <option key={pass.id_pass} value={pass.no_pass}>
                            Pass #{pass.no_pass} {pass.slot ? `(${pass.slot})` : ''} - Status: AVAILABLE
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting || availablePasses.length === 0}
                    className="w-full sm:w-auto px-8 py-3 bg-[#650015] hover:bg-[#80001B] text-white font-bold text-sm rounded-full shadow-[0_4px_0_0_#3F000D] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#650015]"
                  >
                    {submitting ? 'Mengirim Registrasi...' : 'Kirim Permohonan Registrasi'}
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
