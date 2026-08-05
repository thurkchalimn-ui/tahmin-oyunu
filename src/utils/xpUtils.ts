/**
 * XP (deneyim puanı) ve Seviye sistemi. Puanlama:
 *  - Doğru tahmin: +10 XP
 *  - Yanlış tahmin: +2 XP (katılım için küçük bir puan)
 *  - Kazanılan her rozet: +50 XP (tek seferlik)
 *  - Günlük giriş serisinin her günü: +5 XP
 *  - Kazanılan her takipçi: +5 XP
 *  - Davet ettiğin her arkadaş (kayıt olduysa): +25 XP
 *
 * ÖNEMLİ: XP, tıpkı seri/rozet hesaplaması gibi, artımlı olarak eklenmez -
 * her seferinde GÜNCEL verilerden sıfırdan yeniden hesaplanır (bkz.
 * recalculateUserStreak). Bu, çift sayma gibi veri tutarsızlığı risklerini
 * ortadan kaldırır.
 */
export function calculateXP(input: {
  correctPredictions: number;
  totalPredictions: number; // sadece SONUÇLANMIŞ tahminler (doğru + yanlış)
  badgeCount: number;
  activityStreak: number;
  followerCount: number;
  inviteCount: number;
}): number {
  const wrongPredictions = Math.max(0, input.totalPredictions - input.correctPredictions);
  return (
    input.correctPredictions * 10 +
    wrongPredictions * 2 +
    input.badgeCount * 50 +
    input.activityStreak * 5 +
    input.followerCount * 5 +
    input.inviteCount * 25
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
