export const STREAK_TARGET = 15; // Rozet kazanmak için gereken art arda doğru sayısı

/** Seri hesaplaması için sıralanmış, sonuçlanmış bir tahmin öğesi. */
export interface OrderedResolvedPrediction {
  isCorrect: boolean | null;
}

/**
 * Kronolojik sıraya (maçın gerçek başlama saatine göre) DİZİLMİŞ tahmin listesini
 * işleyerek güncel seriyi hesaplar. Herhangi bir yanlış tahmin seriyi sıfırlar.
 * ÖNEMLİ: Bu fonksiyon sıralamayı kendisi yapmaz — çağıran taraf (userService),
 * tahminleri ilgili maçın `kickoffAt` alanına göre sıralayıp buraya öyle vermelidir.
 * Aksi halde (örn. admin panelinde maçların eklenme sırasına göre sıralanırsa) seri
 * yanlış hesaplanabilir - bu proje daha önce tam olarak bu hataya sahipti.
 */
export function calculateCurrentStreak(orderedPredictions: OrderedResolvedPrediction[]): number {
  let streak = 0;
  for (const prediction of orderedPredictions) {
    if (prediction.isCorrect === null) continue; // Sonuçlanmamış olanlar sayılmaz
    streak = prediction.isCorrect ? streak + 1 : 0;
  }
  return streak;
}

/** Kronolojik sıraya dizilmiş tahminlerden tüm zamanların en yüksek serisini hesaplar. */
export function calculateBestStreak(orderedPredictions: OrderedResolvedPrediction[]): number {
  let streak = 0;
  let best = 0;
  for (const prediction of orderedPredictions) {
    if (prediction.isCorrect === null) continue;
    streak = prediction.isCorrect ? streak + 1 : 0;
    best = Math.max(best, streak);
  }
  return best;
}

/** 15'lik hedefe göre ilerleme yüzdesini (0-100) döner - StreakMeter için. */
export function streakProgress(currentStreak: number): number {
  return Math.min(100, Math.round((currentStreak / STREAK_TARGET) * 100));
}
