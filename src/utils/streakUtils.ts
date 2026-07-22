export const STREAK_TARGET = 15; // Rozet kazanmak için gereken art arda doğru sayısı

/** Seri hesaplaması için gereken minimum bilgi. */
export interface StreakInput {
  kickoffAt: string;
  homeTeam: string; // Sadece aynı anda başlayan maçlar arasında STABİL bir sıra için kullanılır
  isCorrect: boolean | null;
}

/**
 * Sonuçlanmış tahminleri kickoffAt'a göre kronolojik sıraya dizip, AYNI ANDA
 * (aynı dakikada) başlayan maçları tek bir grup olarak birleştirir.
 *
 * Neden gerekli: iki maç tam olarak aynı saatte başlıyorsa, "hangisi önce
 * oynandı" sorusunun gerçek bir cevabı yoktur. Bunları sırayla (biri diğerinden
 * önceymiş gibi) değerlendirmek, hangi takımın ismi alfabetik olarak önce
 * geldiğine göre keyfi ve yanıltıcı sonuçlar üretir (ör. aynı anda başlayan
 * doğru+yanlış bir çift, sadece isim sıralaması yüzünden doğrunun hiç
 * sayılmamasına yol açabilir). Bunun yerine, aynı anda başlayan maçlar TEK BİR
 * grup olarak değerlendirilir: grubun hepsi doğruysa serinin tamamına birden
 * eklenir, içlerinden biri bile yanlışsa seri o noktada sıfırlanır.
 */
function groupResolvedByKickoff(items: StreakInput[]): StreakInput[][] {
  const resolved = items.filter((i) => i.isCorrect !== null);
  const sorted = [...resolved].sort((a, b) => {
    const timeDiff = new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime();
    if (timeDiff !== 0) return timeDiff;
    return a.homeTeam.localeCompare(b.homeTeam, 'tr');
  });

  const groups: StreakInput[][] = [];
  for (const item of sorted) {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup[0].kickoffAt === item.kickoffAt) {
      lastGroup.push(item);
    } else {
      groups.push([item]);
    }
  }
  return groups;
}

/** Güncel seriyi hesaplar. Aynı anda başlayan maçlar birlikte (grup olarak) değerlendirilir. */
export function calculateCurrentStreak(items: StreakInput[]): number {
  const groups = groupResolvedByKickoff(items);
  let streak = 0;
  for (const group of groups) {
    const allCorrect = group.every((i) => i.isCorrect === true);
    streak = allCorrect ? streak + group.length : 0;
  }
  return streak;
}

/** Tüm zamanların en yüksek serisini hesaplar (aynı grup mantığıyla). */
export function calculateBestStreak(items: StreakInput[]): number {
  const groups = groupResolvedByKickoff(items);
  let streak = 0;
  let best = 0;
  for (const group of groups) {
    const allCorrect = group.every((i) => i.isCorrect === true);
    streak = allCorrect ? streak + group.length : 0;
    best = Math.max(best, streak);
  }
  return best;
}

/** 15'lik hedefe göre ilerleme yüzdesini (0-100) döner - StreakMeter için. */
export function streakProgress(currentStreak: number): number {
  return Math.min(100, Math.round((currentStreak / STREAK_TARGET) * 100));
}
