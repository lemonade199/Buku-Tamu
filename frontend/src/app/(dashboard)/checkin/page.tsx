'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CheckinRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center h-64 space-y-3">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-xs text-charcoal-muted">Mengarahkan ke Beranda...</p>
    </div>
  );
}
