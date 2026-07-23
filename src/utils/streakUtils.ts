export const STREAK_TARGET = 15; // Rozet kazanmak için gereken art arda doğru sayısı

/** Seri hesaplaması için gereken minimum bilgi. */
export interface StreakInput {
  kickoffAt: string;
  homeTeam: string; // Aynı anda başlayan maçlarda sıralama için kullanılır
  isCorrect: boolean | null;
}

/**
 * Sonuçlanmış tahminleri kickoffAt'a göre kronolojik sıraya dizer. Aynı anda
 * (birebir aynı dakikada) başlayan maçlarda, ev sahibi takım adına göre TERSTEN
 * alfabetik sıra uygulanır (Z'den A'ya) - yani alfabetik olarak sonra gelen
 * takım, seri hesaplamasında önce işlenir.
 */
function sortResolved(items: StreakInput[]): StreakInput[] {
  return items
    .filter((i) => i.isCorrect !== null)
    .sort((a, b) => {
      const timeDiff = new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime();
      if (timeDiff !== 0) return timeDiff;
      return b.homeTeam.localeCompare(a.homeTeam, 'tr'); // ters alfabetik: Z → A
    });
}

/** Güncel seriyi hesaplar. */
export function calculateCurrentStreak(items: StreakInput[]): number {
  const sorted = sortResolved(items);
  let streak = 0;
  for (const item of sorted) {
    streak = item.isCorrect ? streak + 1 : 0;
  }
  return streak;
}

/** Tüm zamanların en yüksek serisini hesaplar. */
export function calculateBestStreak(items: StreakInput[]): number {
  const sorted = sortResolved(items);
  let streak = 0;
  let best = 0;
  for (const item of sorted) {
    streak = item.isCorrect ? streak + 1 : 0;
    best = Math.max(best, streak);
  }
  return best;
}

/** 15'lik hedefe göre ilerleme yüzdesini (0-100) döner - StreakMeter için. */
export function streakProgress(currentStreak: number): number {
  return Math.min(100, Math.round((currentStreak / STREAK_TARGET) * 100));
}
