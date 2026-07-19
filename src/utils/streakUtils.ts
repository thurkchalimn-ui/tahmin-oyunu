import type { Prediction } from '@/types';

export const STREAK_TARGET = 15; // Rozet kazanmak için gereken art arda doğru sayısı

/**
 * Sonuçlanmış tahminleri kronolojik sıraya (matchGlobalOrder) göre işleyerek
 * güncel seriyi hesaplar. Herhangi bir yanlış tahmin seriyi sıfırlar.
 * Gün farketmeksizin art arda 15 doğru bilinirse hedefe ulaşılmış sayılır.
 */
export function calculateCurrentStreak(predictions: Prediction[]): number {
  const resolved = predictions
    .filter((p) => p.isCorrect !== null)
    .sort((a, b) => a.matchGlobalOrder - b.matchGlobalOrder);

  let streak = 0;
  for (const prediction of resolved) {
    if (prediction.isCorrect) {
      streak += 1;
    } else {
      streak = 0; // Seri sıfırlanır, baştan başlar
    }
  }
  return streak;
}

/** Kullanıcının tüm zamanların en yüksek serisini hesaplar (rozet geçmişi için). */
export function calculateBestStreak(predictions: Prediction[]): number {
  const resolved = predictions
    .filter((p) => p.isCorrect !== null)
    .sort((a, b) => a.matchGlobalOrder - b.matchGlobalOrder);

  let streak = 0;
  let best = 0;
  for (const prediction of resolved) {
    streak = prediction.isCorrect ? streak + 1 : 0;
    best = Math.max(best, streak);
  }
  return best;
}

/** 15'lik hedefe göre ilerleme yüzdesini (0-100) döner - StreakMeter için. */
export function streakProgress(currentStreak: number): number {
  return Math.min(100, Math.round((currentStreak / STREAK_TARGET) * 100));
}
