'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export function useWebcam() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Peramban Anda tidak mendukung akses kamera.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });

      setStream(mediaStream);
      setIsCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Gagal mengakses kamera:', err);
      let message = 'Gagal mengakses perangkat kamera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Izin kamera ditolak. Harap berikan izin akses kamera pada peramban Anda.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'Tidak ada perangkat kamera yang terdeteksi di komputer ini.';
      }
      setCameraError(message);
      setIsCameraActive(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, [stream]);

  const capturePhoto = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, width, height);

    // Export as JPEG data URL
    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setCapturedPhoto(photoDataUrl);
    return photoDataUrl;
  }, []);

  const retakePhoto = useCallback(() => {
    setCapturedPhoto(null);
    if (!isCameraActive) {
      startCamera();
    }
  }, [isCameraActive, startCamera]);

  const clearPhoto = useCallback(() => {
    setCapturedPhoto(null);
  }, []);

  useEffect(() => {
    return () => {
      // Clean up stream on unmount
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  return {
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
    setCapturedPhoto,
  };
}
