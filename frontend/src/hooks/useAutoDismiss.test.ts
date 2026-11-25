import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAutoDismiss } from './useAutoDismiss';

describe('useAutoDismiss', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('menutup pesan tepat setelah 5 detik', () => {
    const clear = vi.fn();
    renderHook(() => useAutoDismiss('Berhasil disimpan', clear));
    vi.advanceTimersByTime(4999);
    expect(clear).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it('pesan baru mendapat 5 detik penuh', () => {
    const clear = vi.fn();
    const { rerender } = renderHook(({ msg }) => useAutoDismiss(msg, clear), { initialProps: { msg: 'Pesan pertama' } });
    vi.advanceTimersByTime(4000);
    rerender({ msg: 'Pesan kedua' });
    vi.advanceTimersByTime(4000);
    expect(clear).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it('tidak melakukan apa-apa kalau tidak ada pesan', () => {
    const clear = vi.fn();
    renderHook(() => useAutoDismiss(null, clear));
    vi.advanceTimersByTime(10000);
    expect(clear).not.toHaveBeenCalled();
  });
});
