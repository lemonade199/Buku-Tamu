// Backend menyimpan waktu dalam UTC tanpa penanda zona (contoh: "2026-11-23T06:30:00").
// Tanpa penanda itu browser membacanya sebagai jam lokal, sehingga jam tampil mundur 7 jam dari WIB.
export function parseServerDate(value?: string | null): Date | null {
  if (!value) return null;
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(value);
  const date = new Date(hasZone ? value : `${value}Z`);
  return isNaN(date.getTime()) ? null : date;
}

// Format jam yang dipakai di semua tabel: "13.30".
export function formatJam(value?: string | null, separator = '.'): string {
  const date = parseServerDate(value);
  if (!date) return '-';
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}${separator}${minutes}`;
}
