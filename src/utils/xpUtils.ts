import type { Badge } from '@/types';

/**
 * XP (deneyim puanı) ve Seviye sistemi. Puanlama:
 *  - Doğru tahmin: +10 XP
 *  - Yanlış tahmin: +2 XP (katılım için küçük bir puan)
 *  - Kazanılan SERİ rozeti (matchStreak): eşikle ORANTILI - "3 Doğru" +30 XP,
 *    "50 Doğru" +500 XP, "Efsane Seri" (100) +1000 XP (bkz. aşağıdaki not)
 *  - Kazanılan diğer rozetler (devamlılık, tahmin, takipçi): +50 XP (sabit)
 *  - Günlük giriş serisinin her günü: +5 XP
 *  - Kazanılan her takipçi: +5 XP
 *  - Davet ettiğin her arkadaş (kayıt olduysa): +50 XP
 *
 * ÖNEMLİ: Oyunun adı "Tahmin Serisi" - yani SERİ, oyunun kalbi. Bu yüzden
 * seri rozetleri diğerleri gibi sabit +50 XP vermek yerine, ulaşılan eşikle
 * orantılı XP veriyor (eşik × 10) - uzun bir seri yapmak, kısa bir seriden
 * çok daha değerli hissettirsin diye. XP, tıpkı seri/rozet hesaplaması gibi,
 * artımlı olarak eklenmez - her seferinde GÜNCEL verilerden sıfırdan yeniden
 * hesaplanır (bkz. recalculateUserStreak). Bu, çift sayma gibi veri
 * tutarsızlığı risklerini ortadan kaldırır.
 */
export function calculateXP(input: {
  correctPredictions: number;
  totalPredictions: number; // sadece SONUÇLANMIŞ tahminler (doğru + yanlış)
  badges: Badge[];
  activityStreak: number;
  followerCount: number;
  inviteCount: number;
}): number {
  const wrongPredictions = Math.max(0, input.totalPredictions - input.correctPredictions);

  let badgeXP = 0;
  for (const badge of input.badges) {
    badgeXP += badge.type === 'matchStreak' ? badge.value * 10 : 50;
  }

  return (
    input.correctPredictions * 10 +
    wrongPredictions * 2 +
    badgeXP +
    input.activityStreak * 5 +
    input.followerCount * 5 +
    input.inviteCount * 50
  );
}

export interface LevelInfo {
  level: number;
  xpIntoLevel: number; // Bu seviyeye girdiğinden beri kazanılan XP
  xpForNextLevel: number; // Bir sonraki seviyeye geçmek için gereken TOPLAM XP (bu seviye içinde)
  progress: number; // 0-100 arası, bir sonraki seviyeye ilerleme yüzdesi
}

/**
 * Toplam XP'den seviyeyi hesaplar. Seviye eşikleri kademeli olarak büyür
 * (Seviye 2: 50 XP, Seviye 3: 200 XP, Seviye 4: 450 XP, Seviye 5: 800 XP...)
 * - formül: seviye N'nin başlangıcı = 50 × (N-1)².
 */
export function getLevelInfo(xp: number): LevelInfo {
  const safeXp = Math.max(0, xp);
  const level = Math.max(1, Math.floor(1 + Math.sqrt(safeXp / 50)));
  const xpAtLevelStart = 50 * (level - 1) ** 2;
  const xpAtNextLevel = 50 * level ** 2;
  const xpIntoLevel = safeXp - xpAtLevelStart;
  const xpForNextLevel = xpAtNextLevel - xpAtLevelStart;
  const progress = xpForNextLevel > 0 ? Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100)) : 100;
  return { level, xpIntoLevel, xpForNextLevel, progress };
}
