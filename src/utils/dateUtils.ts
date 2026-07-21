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

/** ISO zaman damgasını sadece saat:dakika olarak gösterir (sohbet mesajları için). */
export function formatChatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

/** Verilen tarih anahtarını (YYYY-MM-DD) belirtilen gün kadar ileri/geri kaydırır. */
export function shiftDateKey(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

/** Tarih anahtarını 'gün ay' formatında okunabilir başlığa çevirir (ör. '21 Temmuz'). */
export function formatDateHeading(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00`);
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
}

/** Maçın başlama saati geçmiş mi? (Tahmin kilidi için kullanılır) */
export function isMatchLocked(kickoffAt: string): boolean {
  return new Date(kickoffAt).getTime() <= Date.now();
}
