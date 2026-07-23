import type { Match } from '@/types';

/**
 * İki maçı kronolojik olarak (en erken önce) karşılaştırır. Aynı saatte
 * başlayan maçlarda, ev sahibi takımın adına göre alfabetik sıralama
 * (A'dan Z'ye) yapılır. Bu fonksiyon; ana sayfa, profil sayfaları VE seri
 * hesaplaması (userService.ts / automation/check-results.js) tarafından
 * ORTAK olarak kullanılır - böylece "ekranda görünen sıra" ile "serinin
 * hesaplandığı sıra" her zaman birebir aynı olur.
 */
export function compareMatchesAscending(
  a: { kickoffAt: string; homeTeam: string },
  b: { kickoffAt: string; homeTeam: string },
): number {
  const timeDiff = new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime();
  if (timeDiff !== 0) return timeDiff;
  return a.homeTeam.localeCompare(b.homeTeam, 'tr');
}

/**
 * Aynı kurala göre, en son (en geç) başlayan maç önce olacak şekilde karşılaştırır.
 * Bilinçli olarak compareMatchesAscending'in ARGÜMANLARI TAKAS EDİLEREK çağrılması
 * şeklinde tanımlanmıştır (ayrı bir mantık yazılmamıştır) - böylece bu, ascending
 * sıralamanın matematiksel olarak BİREBİR TAM TERSİ olur (tie-break dahil). Ayrı
 * bir tie-break tanımlansaydı, aynı anda başlayan maçlarda ekrandaki sıra ile
 * seri hesaplamasındaki sıranın tutarsız olma riski olurdu.
 */
export function compareMatchesDescending(
  a: { kickoffAt: string; homeTeam: string },
  b: { kickoffAt: string; homeTeam: string },
): number {
  return compareMatchesAscending(b, a);
}

/**
 * Bir listeyi, sonucu belirlenmemiş maçlar en erken başlayacak olan üstte
 * olacak şekilde; sonuçlanmış maçları ise en son başlayan üstte olacak
 * şekilde iki gruba ayırıp birleştirir. Ana sayfa ve profil sayfalarındaki
 * sıralama mantığı buradan gelir.
 */
export function orderMatchesForDisplay<T extends { kickoffAt: string; homeTeam: string; result: unknown }>(
  items: T[],
): T[] {
  const pending = items.filter((m) => m.result === null).sort(compareMatchesAscending);
  const resolved = items.filter((m) => m.result !== null).sort(compareMatchesDescending);
  return [...pending, ...resolved];
}

/** Sadece görüntüleme amaçlı: bir günün maçlarına 1'den başlayan sıra numarası atar (admin paneli için). */
export function assignMatchNumbers(matches: Match[]): Map<string, number> {
  const sorted = [...matches].sort(compareMatchesAscending);
  return new Map(sorted.map((match, index) => [match.id, index + 1]));
}
