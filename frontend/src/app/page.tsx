'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { Camera, Clock, RefreshCw, CheckCircle2, AlertCircle, LogIn } from 'lucide-react';
import CheckinSuccessModal from '@/components/CheckinSuccessModal';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

interface PassOption {
  id_pass: number;
  no_pass: string;
  slot?: string;
  status: string;
}

export default function KioskCheckinPage() {
  // Current time state
  const [currentDateTime, setCurrentDateTime] = useState<string>('');

  // Form states
  const [fullname, setFullname] = useState('');
  const [institution, setInstitution] = useState('');
  const [purpose, setPurpose] = useState('');
  const [selectedPassNo, setSelectedPassNo] = useState<string>('');
  const [availablePasses, setAvailablePasses] = useState<PassOption[]>([]);
  const [loadingPasses, setLoadingPasses] = useState(true);

  // Camera & Photo states
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Submission & Modal states
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [checkinResult, setCheckinResult] = useState<any>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Real-time clock formatted in Indonesian
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
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch available passes
  const fetchPasses = useCallback(async () => {
    setLoadingPasses(true);
    try {
      const res = await axios.get<{ success: boolean; data: PassOption[] }>(`${API_BASE_URL}/pass/available`);
      const passes = res.data.data || [];
      setAvailablePasses(passes);
      if (passes.length > 0) {
        setSelectedPassNo(passes[0].no_pass);
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

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    setCapturedPhoto(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser tidak mendukung akses kamera.');
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      setStream(mediaStream);
      setIsCameraOpen(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Kamera error:', err);
      let msg = 'Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan.';
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'Perangkat kamera tidak ditemukan pada perangkat ini.';
      }
      setCameraError(msg);
      setIsCameraOpen(false);
    }
  };

  // Stop Camera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  }, [stream]);

  // Auto clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [stream]);

  // Capture Snapshot
  const captureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvasRef.current = canvas;
    }
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip horizontal to match mirrored video preview
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64 = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedPhoto(base64);
    stopCamera();
    setFormError('');
  };

  // Retake Photo
  const handleRetake = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!fullname.trim()) {
      setFormError('Nama Tamu wajib diisi.');
      return;
    }

    if (!capturedPhoto) {
      setFormError('Foto pengunjung wajib diambil sebelum check-in.');
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
        telephone: '-',
        no_pass: selectedPassNo,
        photo_base64: capturedPhoto,
      });

      setCheckinResult(res.data.data);
      setShowSuccessModal(true);
    } catch (err: any) {
      console.error('Checkin error:', err);
      const msg = err.response?.data?.message || 'Gagal memproses check in. Silakan coba kembali.';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Reset form for next visitor
  const handleResetForNextVisitor = () => {
    setFullname('');
    setInstitution('');
    setPurpose('');
    setCapturedPhoto(null);
    setFormError('');
    setShowSuccessModal(false);
    setCheckinResult(null);
    stopCamera();
    fetchPasses();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FEF7EC]">
      {/* Top Header */}
      <header className="bg-[#8A001A] text-white px-6 py-3 flex items-center justify-between shadow-md relative z-20">
        <div className="flex items-center space-x-3">
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans lowercase">
            seamolec
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {/* Real-time date time pill */}
          <div className="bg-white text-gray-800 rounded-full px-4 py-1.5 flex items-center text-xs sm:text-sm font-medium shadow-sm space-x-2 border border-gray-100">
            <Clock className="w-4 h-4 text-gray-500" />
            <span>{currentDateTime || 'Memuat waktu...'}</span>
          </div>

          {/* Discreet link to Staff Login / Dashboard */}
          <Link
            href="/login"
            title="Masuk Petugas / Admin"
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <LogIn className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Main Area */}
      <main className="flex-1 relative flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden">
        {/* Content Container (Card + Button) */}
        <div className="relative z-10 w-full max-w-[880px] flex flex-col items-center space-y-4">
          {/* Form Card with 3D Maroon Outer Frame */}
          <div className="w-full bg-white rounded-[24px] sm:rounded-[28px] border-[3px] border-[#650015] shadow-[0_10px_0_0_#650015] p-5 sm:p-8 transition-all">
            {/* Title */}
            <h1 className="text-center font-serif text-2xl sm:text-[28px] text-[#222222] tracking-wide mb-5 lowercase">
              form input data tamu
            </h1>

            {/* Error Notification */}
            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs sm:text-sm text-red-700 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
                <span>{formError}</span>
              </div>
            )}

            {/* Camera / Snapshot Box */}
            <div className="bg-[#D9D9D9] rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center relative overflow-hidden min-h-[220px] mb-6">
              {/* Hidden canvas for capturing image */}
              <canvas ref={canvasRef} className="hidden" />

              {/* View 1: Photo Captured */}
              {capturedPhoto ? (
                <div className="flex flex-col items-center space-y-3">
                  <div className="relative w-44 h-32 rounded-xl overflow-hidden shadow border-2 border-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
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
                    className="bg-[#650015] hover:bg-[#80001B] text-white rounded-full py-2 px-6 text-xs sm:text-sm font-medium flex items-center space-x-2 shadow transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Ambil Foto Ulang</span>
                  </button>
                </div>
              ) : isCameraOpen ? (
                /* View 2: Live Video Stream */
                <div className="flex flex-col items-center space-y-3 w-full max-w-sm">
                  <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-black shadow border-2 border-[#650015]">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover -scale-x-100"
                    />
                    {/* Facial Guide */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-36 h-48 rounded-[50%] border-2 border-dashed border-white/70" />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={captureSnapshot}
                      className="bg-[#650015] hover:bg-[#80001B] text-white rounded-full py-2 px-6 text-xs sm:text-sm font-semibold flex items-center space-x-2 shadow-md transition-all cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Jepret Foto Sekarang</span>
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-full py-2 px-4 text-xs font-medium transition-all"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                /* View 3: Default Placeholder Avatar matching Screenshot */
                <div className="flex flex-col items-center space-y-4">
                  {/* Silhouette Avatar Graphic */}
                  <div className="w-24 h-24 sm:w-28 sm:h-28 text-[#505050] flex items-center justify-center">
                    <svg viewBox="0 0 100 100" fill="currentColor" className="w-full h-full">
                      <circle cx="50" cy="34" r="20" />
                      <path d="M18 86c0-18 14-32 32-32s32 14 32 32v2H18v-2z" />
                    </svg>
                  </div>

                  {cameraError && (
                    <p className="text-xs text-red-600 bg-red-50 px-3 py-1 rounded-md max-w-xs text-center">
                      {cameraError}
                    </p>
                  )}

                  {/* Maroon Button "Ambil Snapshot foto" */}
                  <button
                    type="button"
                    onClick={startCamera}
                    className="bg-[#650015] hover:bg-[#80001B] text-white rounded-full py-2.5 px-8 text-xs sm:text-sm font-medium flex items-center space-x-2 shadow transition-all cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Ambil Snapshot foto</span>
                  </button>
                </div>
              )}
            </div>

            {/* Form Fields: Two Columns */}
            <form id="checkin-form" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* Left Column */}
                <div className="space-y-3.5">
                  {/* Pass ID Selection */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-800 mb-1">
                      No. pass ID:
                    </label>
                    {loadingPasses ? (
                      <div className="w-full border border-gray-300 rounded-xl px-4 py-2.5 bg-gray-50 text-xs text-gray-500">
                        Memuat nomor pass...
                      </div>
                    ) : availablePasses.length > 0 ? (
                      <select
                        value={selectedPassNo}
                        onChange={(e) => setSelectedPassNo(e.target.value)}
                        className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30 focus:border-[#8A001A] transition-all font-mono"
                      >
                        {availablePasses.map((p) => (
                          <option key={p.id_pass} value={p.no_pass}>
                            pass #{p.no_pass} {p.slot ? `(Slot: ${p.slot})` : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="w-full border border-red-300 rounded-xl px-4 py-2 bg-red-50 text-xs text-red-600">
                        Semua kartu pass sedang digunakan
                      </div>
                    )}
                  </div>

                  {/* Guest Full Name */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-800 mb-1">
                      Nama Tamu:
                    </label>
                    <input
                      type="text"
                      required
                      value={fullname}
                      onChange={(e) => setFullname(e.target.value)}
                      placeholder="contoh: AHMAD"
                      className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30 focus:border-[#8A001A] transition-all"
                    />
                  </div>

                  {/* Institution */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-800 mb-1">
                      Instansi/perusahaan:
                    </label>
                    <input
                      type="text"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      placeholder="contoh: PT Jaya"
                      className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30 focus:border-[#8A001A] transition-all"
                    />
                  </div>
                </div>

                {/* Right Column: Purpose */}
                <div className="flex flex-col">
                  <label className="block text-xs sm:text-sm font-medium text-gray-800 mb-1">
                    Keperluan/tujuan kedatangan:
                  </label>
                  <textarea
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="contoh: meeting"
                    className="w-full flex-1 min-h-[140px] md:min-h-[170px] border border-gray-300 rounded-xl p-3.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8A001A]/30 focus:border-[#8A001A] transition-all resize-none"
                  />
                </div>
              </div>
            </form>
          </div>

          {/* Wide Rounded Maroon Action Button below Card */}
          <button
            type="submit"
            form="checkin-form"
            disabled={submitting || availablePasses.length === 0}
            className="w-full max-w-[880px] bg-[#8A001A] hover:bg-[#650015] active:scale-[0.99] text-white font-medium py-3.5 px-6 rounded-full text-sm sm:text-base tracking-wide shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 cursor-pointer"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Memproses Check In...</span>
              </>
            ) : (
              <span>Check in & ambil kartu pass</span>
            )}
          </button>
        </div>
      </main>

      {/* Success Popup Modal */}
      <CheckinSuccessModal
        isOpen={showSuccessModal}
        result={checkinResult}
        onReset={handleResetForNextVisitor}
      />
    </div>
  );
}
