import { useEffect } from 'react';

export const NOTICE_DURATION_MS = 5000;

/**
 * Menutup pesan sukses/gagal setelah beberapa detik.
 * Hitungan diulang setiap kali pesannya berganti, jadi pesan baru selalu tampil penuh 5 detik.
 */
export function useAutoDismiss(value: unknown, clear: () => void, durationMs = NOTICE_DURATION_MS) {
  useEffect(() => {
    if (!value) return;
    const timer = setTimeout(clear, durationMs);
    return () => clearTimeout(timer);
    // `clear` sengaja tidak ikut dependensi: biasanya fungsi baru di setiap render dan akan mengulang hitungan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, durationMs]);
}
