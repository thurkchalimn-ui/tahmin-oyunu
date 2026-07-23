import { compareMatchesAscending } from '@/utils/matchNumbering';

export const STREAK_TARGET = 15; // Rozet kazanmak için gereken art arda doğru sayısı

/** Seri hesaplaması için gereken minimum bilgi. */
export interface StreakInput {
  kickoffAt: string;
  homeTeam: string;
  isCorrect: boolean | null;
}

/**
 * Güncel seriyi hesaplar. Mantık: tahminleri ESKİDEN YENİYE sırala, sonra
 * diziyi TERSİNE ÇEVİR (yani en yeni en üstte - profil sayfasında GÖRÜNEN
 * sırayla birebir aynı). En üstten başlayarak aşağı doğru say; ilk yanlışta
 * dur. Bu, "en üstteki (en son) maçların durumu seriyi belirlesin" kuralını
 * birebir uygular - ekranda üst üste doğru gördüğün kadar sayı, seri de o
 * kadar olur.
 */
export function calculateCurrentStreak(items: StreakInput[]): number {
  const resolved = items.filter((i) => i.isCorrect !== null);
  const newestFirst = [...resolved].sort(compareMatchesAscending).reverse();

  let streak = 0;
  for (const item of newestFirst) {
    if (item.isCorrect) {
      streak += 1;
    } else {
      break; // İlk yanlışta dur - güncel seri burada sona erer
    }
  }
  return streak;
}

/**
 * Tüm zamanların en yüksek serisini hesaplar. Burada "dur" değil "sıfırla ve
 * devam et" mantığı kullanılır, çünkü amaç geçmişteki EN UZUN kesintisiz
 * diziyi bulmak (sadece en güncel olanı değil).
 */
export function calculateBestStreak(items: StreakInput[]): number {
  const resolved = items.filter((i) => i.isCorrect !== null).sort(compareMatchesAscending);

  let streak = 0;
  let best = 0;
  for (const item of resolved) {
    streak = item.isCorrect ? streak + 1 : 0;
    best = Math.max(best, streak);
  }
  return best;
}

/** 15'lik hedefe göre ilerleme yüzdesini (0-100) döner - StreakMeter için. */
export function streakProgress(currentStreak: number): number {
  return Math.min(100, Math.round((currentStreak / STREAK_TARGET) * 100));
}
