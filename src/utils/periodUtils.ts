import { toDateKey } from '@/utils/dateUtils';

export type StatsPeriod = 'week' | 'month' | 'all';

/** İçinde bulunulan haftanın Pazartesi gününü 'YYYY-MM-DD' olarak döner. */
function startOfWeekKey(): string {
  const now = new Date();
  const day = now.getDay(); // 0 = Pazar
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);
  return toDateKey(monday);
}

/** İçinde bulunulan haftadan SONRAKİ Pazartesi'yi 'YYYY-MM-DD' olarak döner (üst sınır - dahil değil). */
function endOfWeekKey(): string {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() - diffToMonday + 7);
  nextMonday.setHours(0, 0, 0, 0);
  return toDateKey(nextMonday);
}

/** İçinde bulunulan ayın 1'ini 'YYYY-MM-DD' olarak döner. */
function startOfMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

/** İçinde bulunulan aydan SONRAKİ ayın 1'ini 'YYYY-MM-DD' olarak döner (üst sınır - dahil değil). */
function endOfMonthKey(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return toDateKey(nextMonth);
}

/**
 * Verilen dönem için başlangıç-bitiş tarih aralığını döner (bitiş tarihi dahil değildir).
 * 'all' için sınır yoktur (null döner) - liderlik tablosu ve profil sayfalarında
 * ortak olarak kullanılır, böylece "bu hafta/bu ay" tanımı her yerde birebir aynıdır.
 */
export function getPeriodRange(period: StatsPeriod): { start: string; end: string } | null {
  if (period === 'all') return null;
  return period === 'week'
    ? { start: startOfWeekKey(), end: endOfWeekKey() }
    : { start: startOfMonthKey(), end: endOfMonthKey() };
}
