'use client';

import React, { useEffect } from 'react';
import { useWebcam } from '@/hooks/useWebcam';
import { Camera, RefreshCw, CheckCircle2, AlertTriangle, VideoOff } from 'lucide-react';

interface WebcamCaptureProps {
  onPhotoConfirmed: (photoBase64: string) => void;
  onPhotoCleared?: () => void;
}

export default function WebcamCapture({
  onPhotoConfirmed,
  onPhotoCleared,
}: WebcamCaptureProps) {
  const {
    videoRef,
    canvasRef,
    isCameraActive,
    capturedPhoto,
    cameraError,
    startCamera,
    stopCamera,
    capturePhoto,
    retakePhoto,
    clearPhoto,
  } = useWebcam();

  // Auto-start camera when component mounts
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const handleCapture = () => {
    const photo = capturePhoto();
    if (photo) {
      onPhotoConfirmed(photo);
    }
  };

  const handleRetake = () => {
    retakePhoto();
    if (onPhotoCleared) {
      onPhotoCleared();
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-ivory-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-charcoal flex items-center space-x-2">
            <Camera className="w-4 h-4 text-brand-500" />
            <span>Kamera Pengambilan Foto Wajib</span>
          </h3>
          <p className="text-[11px] text-charcoal-muted">
            Foto tamu harus terlihat jelas menghadap ke depan
          </p>
        </div>
        {capturedPhoto ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Foto Tersedia
          </span>
        ) : isCameraActive ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-50 text-brand-700 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mr-1.5" />
            Live Preview
          </span>
        ) : null}
      </div>

      {/* Main Viewport Container */}
      <div className="relative aspect-[4/3] bg-neutral-900 rounded-xl overflow-hidden border-2 border-brand-500/40 shadow-inner flex items-center justify-center">
        {/* Hidden Canvas for capturing */}
        <canvas ref={canvasRef} className="hidden" />

        {capturedPhoto ? (
          /* Preview captured photo */
          <div className="relative w-full h-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={capturedPhoto}
              alt="Foto Tamu"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 text-center">
              <p className="text-white text-xs font-semibold">Foto Berhasil Diambil</p>
            </div>
          </div>
        ) : isCameraActive ? (
          /* Live Video Stream with Silhouette Guide */
          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover -scale-x-100"
            />

            {/* Facial Silhouette Alignment Guide */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-48 h-60 rounded-[50%] border-2 border-dashed border-white/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)] flex flex-col items-center justify-center">
                <span className="text-[10px] font-medium text-white/90 bg-black/50 px-2 py-0.5 rounded-full mb-1">
                  Posisikan Wajah Di Sini
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Camera Error or Inactive State */
          <div className="text-center p-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto">
              {cameraError ? <AlertTriangle className="w-6 h-6 text-amber-500" /> : <VideoOff className="w-6 h-6" />}
            </div>
            <p className="text-xs text-white/80 max-w-xs mx-auto leading-relaxed">
              {cameraError || 'Kamera sedang dinonaktifkan atau belum diizinkan.'}
            </p>
            <button
              type="button"
              onClick={startCamera}
              className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-lg shadow transition-colors inline-flex items-center space-x-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Coba Buka Kamera Lagi</span>
            </button>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-center gap-3 pt-1">
        {capturedPhoto ? (
          <button
            type="button"
            onClick={handleRetake}
            className="flex-1 py-2.5 px-4 bg-ivory-100 hover:bg-ivory-200 text-charcoal text-xs font-semibold rounded-xl border border-ivory-200 transition-colors flex items-center justify-center space-x-2"
          >
            <RefreshCw className="w-4 h-4 text-brand-500" />
            <span>Foto Ulang</span>
          </button>
        ) : (
          <button
            type="button"
            disabled={!isCameraActive}
            onClick={handleCapture}
            className="flex-1 py-3 px-6 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            <Camera className="w-4 h-4" />
            <span>Ambil Foto Tamu Sekarang</span>
          </button>
        )}
      </div>
    </div>
  );
}
