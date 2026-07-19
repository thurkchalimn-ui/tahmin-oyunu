/** Verilen tarihi 'YYYY-MM-DD' formatına çevirir (yerel saat diliminde). */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Bugünün tarih anahtarını döner. */
export function todayKey(): string {
  return toDateKey(new Date());
}

/** ISO zaman damgasını 'gün, saat:dakika' formatında okunabilir metne çevirir. */
export function formatMatchTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Maçın başlama saati geçmiş mi? (Tahmin kilidi için kullanılır) */
export function isMatchLocked(kickoffAt: string): boolean {
  return new Date(kickoffAt).getTime() <= Date.now();
}
