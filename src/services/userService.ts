import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  limit as fbLimit,
  updateDoc,
  where,
  documentId,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { UserProfile, Prediction, Badge } from '@/types';
import { calculateCurrentStreak, calculateBestStreak, STREAK_TARGET } from '@/utils/streakUtils';
import { isUsernameTaken, claimUsername, releaseUsername } from '@/services/usernameService';
import { containsProfanity } from '@/utils/profanityFilter';
import { toDateKey } from '@/utils/dateUtils';
import { calculateXP, getLevelInfo } from '@/utils/xpUtils';

/** Toplam doğru tahmin sayısına göre kazanılan rozet eşikleri. */
const CORRECT_TOTAL_MILESTONES = [50, 100, 250, 500, 1000];

/** Art arda kaç gün uygulamayı açtığına göre kazanılan rozet eşikleri. */
export const ACTIVITY_STREAK_MILESTONES = [7, 30, 60, 90, 180, 365];

/**
 * Ham rozet verisini güncel Badge şekline çevirir. Eski kayıtlarda (bu özellik
 * genişletilmeden önce) sadece `{ streakLength, achievedAt }` vardı, `type`
 * alanı yoktu - hepsi o zamanlar sadece "seri" rozetiydi. Bu fonksiyon, eski
 * kayıtları otomatik olarak `type: 'matchStreak'` olarak yorumlar.
 */
function normalizeBadges(raw: unknown): Badge[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((b: Record<string, unknown>) => {
    if (b.type) return b as Badge;
    return { type: 'matchStreak', value: b.streakLength as number, achievedAt: b.achievedAt as string };
  });
}

/** Firestore Timestamp alanlarını ISO string'e çevirerek UserProfile'a dönüştürür. */
export function mapUserDoc(id: string, data: Record<string, unknown>): UserProfile {
  const toIso = (v: unknown) => (v instanceof Timestamp ? v.toDate().toISOString() : (v as string) ?? '');
  const xp = (data.xp as number) ?? 0;
  return {
    uid: id,
    email: (data.email as string) ?? '',
    displayName: (data.displayName as string) ?? 'İsimsiz Oyuncu',
    currentStreak: (data.currentStreak as number) ?? 0,
    bestStreak: (data.bestStreak as number) ?? 0,
    totalPredictions: (data.totalPredictions as number) ?? 0,
    correctPredictions: (data.correctPredictions as number) ?? 0,
    badges: normalizeBadges(data.badges),
    isAdmin: false, // AuthContext içinde admins koleksiyonuna göre ayrıca belirlenir
    lastSeenChatAt: data.lastSeenChatAt ? toIso(data.lastSeenChatAt) : null,
    lastSeenRank: (data.lastSeenRank as number | undefined) ?? null,
    lastSeenProfileAt: data.lastSeenProfileAt ? toIso(data.lastSeenProfileAt) : null,
    avatarUrl: (data.avatarUrl as string) || null,
    notifyOnResult: data.notifyOnResult !== false, // belirtilmemişse (eski kullanıcılar) varsayılan true
    notifyOnReminder: data.notifyOnReminder !== false,
    lastActiveAt: data.lastActiveAt ? toIso(data.lastActiveAt) : null,
    activityStreak: (data.activityStreak as number) ?? 0,
    lastActiveDateKey: (data.lastActiveDateKey as string) || null,
    xp,
    level: getLevelInfo(xp).level,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

/** Tek seferlik kullanıcı profili okuma. */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return mapUserDoc(snap.id, snap.data());
}

/** Kullanıcı profilini gerçek zamanlı dinler (streak güncellemeleri anında yansır). */
export function subscribeUserProfile(
  uid: string,
  onChange: (profile: UserProfile | null) => void,
  onError: (message: string) => void,
): () => void {
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => onChange(snap.exists() ? mapUserDoc(snap.id, snap.data()) : null),
    () => onError('Profil bilgileri yüklenemedi.'),
  );
}

/**
 * Liderlik tablosunu en yüksek XP'ye göre gerçek zamanlı dinler.
 * ÖNEMLİ: Daha önce `bestStreak`e göre sıralanıyordu - artık XP/Seviye
 * sistemi eklendiği için ana sıralama ölçütü XP oldu (bkz. xpUtils.ts).
 */
export function subscribeLeaderboard(
  onChange: (users: UserProfile[]) => void,
  onError: (message: string) => void,
  topN = 50,
): () => void {
  const q = query(collection(db, 'users'), orderBy('xp', 'desc'), fbLimit(topN));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => mapUserDoc(d.id, d.data()))),
    () => onError('Liderlik tablosu yüklenemedi.'),
  );
}

/** Kullanıcının görünen adını günceller. */
/**
 * Kullanıcının görünen adını günceller. Küfür/uygunsuz kelime içermediğini ve
 * başka bir kullanıcı tarafından alınmadığını doğrular; eski ismin kilidini
 * kaldırıp yeni ismi kilitler (bkz. usernameService.ts).
 */
export async function updateDisplayName(uid: string, displayName: string): Promise<void> {
  if (containsProfanity(displayName)) {
    throw new Error('Kullanıcı adında uygunsuz bir kelime var, lütfen başka bir isim seç.');
  }
  if (await isUsernameTaken(displayName, uid)) {
    throw new Error('Bu kullanıcı adı zaten alınmış, lütfen başka bir isim dene.');
  }

  const currentSnap = await getDoc(doc(db, 'users', uid));
  const previousName = currentSnap.data()?.displayName as string | undefined;

  await claimUsername(uid, displayName);
  if (previousName && previousName.trim().toLowerCase() !== displayName.trim().toLowerCase()) {
    await releaseUsername(previousName);
  }

  await updateDoc(doc(db, 'users', uid), { displayName, updatedAt: Timestamp.now() });
}

/**
 * Kullanıcının profil görselini (bir futbolcu fotoğrafı, takım logosu ya da
 * başka bir görsel linki) günceller. Boş bırakılırsa avatar kaldırılır ve
 * varsayılan ⚽ ikonuna dönülür.
 */
export async function updateAvatarUrl(uid: string, avatarUrl: string): Promise<void> {
  const trimmed = avatarUrl.trim();
  await updateDoc(doc(db, 'users', uid), {
    avatarUrl: trimmed || null,
    updatedAt: Timestamp.now(),
  });
}

/** Kullanıcının hangi bildirim türlerini almak istediğini günceller. */
export async function updateNotificationPreferences(
  uid: string,
  prefs: { notifyOnResult?: boolean; notifyOnReminder?: boolean },
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { ...prefs, updatedAt: Timestamp.now() });
}

/**
 * Kullanıcının "gerçekten aktif" olduğunu (uygulamayı açtığını) kaydeder -
 * admin panelindeki "Aktif Kullanıcı" istatistiği için kullanılır. Gereksiz
 * yazma trafiğini önlemek için, son kayıttan bu yana en az 1 saat geçmediyse
 * hiçbir şey yapmaz (çağıran taraf bu kontrolü yapar, bkz. AuthContext.tsx).
 */
export async function touchLastActive(uid: string, currentLastActiveAt: string | null): Promise<void> {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  if (currentLastActiveAt && new Date(currentLastActiveAt).getTime() > oneHourAgo) return;
  await updateDoc(doc(db, 'users', uid), { lastActiveAt: Timestamp.now() });
}

/**
 * Kullanıcının "art arda kaç gündür uygulamayı açtığını" günceller ve eşik
 * aşıldıkça otomatik rozet verir. Günde en fazla bir kez sayar (aynı gün
 * içinde tekrar çağrılırsa hiçbir şey yapmaz). Bugün ile en son sayılan gün
 * arasında tam bir gün fark varsa seri +1 artar; daha fazla gün atlanmışsa
 * (kullanıcı bir günü kaçırmışsa) seri 1'e sıfırlanır.
 *
 * ÖNEMLİ: Giriş serisi XP'nin bir bileşeni olduğu için (bkz. xpUtils.ts),
 * `current` artık correctPredictions/totalPredictions da içeriyor - bu
 * değerler değişmese bile XP'nin yeniden hesaplanıp güncel tutulması için gerekli.
 */
export async function touchDailyActivity(
  uid: string,
  current: {
    activityStreak: number;
    lastActiveDateKey: string | null;
    badges: Badge[];
    correctPredictions: number;
    totalPredictions: number;
  },
): Promise<void> {
  const todayKey = toDateKey(new Date());
  if (current.lastActiveDateKey === todayKey) return; // Bugün zaten sayıldı

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = toDateKey(yesterday);

  const newStreak = current.lastActiveDateKey === yesterdayKey ? current.activityStreak + 1 : 1;

  const badges = [...current.badges];
  for (const milestone of ACTIVITY_STREAK_MILESTONES) {
    const alreadyHas = current.badges.some((b) => b.type === 'activityStreak' && b.value === milestone);
    if (!alreadyHas && newStreak >= milestone) {
      badges.push({ type: 'activityStreak', value: milestone, achievedAt: new Date().toISOString() });
    }
  }

  const xp = calculateXP({
    correctPredictions: current.correctPredictions,
    totalPredictions: current.totalPredictions,
    badgeCount: badges.length,
    activityStreak: newStreak,
  });

  await updateDoc(doc(db, 'users', uid), {
    activityStreak: newStreak,
    lastActiveDateKey: todayKey,
    badges,
    xp,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Verilen maç ID'lerinin sıralama için gereken bilgilerini (kickoffAt ve
 * homeTeam) toplu olarak getirir. matchService.ts'deki benzer fonksiyonun
 * küçük bir kopyasıdır; matchService zaten bu dosyadaki recalculateUserStreak'i
 * çağırdığı için döngüsel import'tan kaçınmak amacıyla burada ayrıca tanımlanmıştır.
 */
async function getMatchOrderingInfoByIds(
  matchIds: string[],
): Promise<Map<string, { kickoffAt: string; homeTeam: string }>> {
  const uniqueIds = Array.from(new Set(matchIds));
  const result = new Map<string, { kickoffAt: string; homeTeam: string }>();
  if (uniqueIds.length === 0) return result;

  const chunks: string[][] = [];
  for (let i = 0; i < uniqueIds.length; i += 30) {
    chunks.push(uniqueIds.slice(i, i + 30));
  }

  await Promise.all(
    chunks.map(async (chunk) => {
      const q = query(collection(db, 'matches'), where(documentId(), 'in', chunk));
      const snap = await getDocs(q);
      snap.docs.forEach((d) => {
        const data = d.data();
        const kickoffAt = data.kickoffAt;
        const iso = kickoffAt instanceof Timestamp ? kickoffAt.toDate().toISOString() : (kickoffAt as string);
        result.set(d.id, { kickoffAt: iso ?? '', homeTeam: (data.homeTeam as string) ?? '' });
      });
    }),
  );
  return result;
}

/**
 * Bir maç sonucu girildikten sonra çağrılır: kullanıcının tüm sonuçlanmış
 * tahminlerini, ait oldukları maçın GERÇEK BAŞLAMA SAATİNE (kickoffAt) göre
 * kronolojik sıraya dizip yeniden değerlendirir, güncel seriyi, en iyi seriyi,
 * XP'yi ve 15'lik hedefe ulaşıldıysa yeni rozeti hesaplayıp kaydeder.
 *
 * ÖNEMLİ: Sıralama, maçın admin panelinde EKLENME sırasına göre değil, gerçek
 * `kickoffAt` saatine (aynı saatte başlayan maçlarda ev sahibi takım adına göre
 * alfabetik sıraya) göre yapılır - bu, ana sayfada ve profil sayfalarında
 * kullanıcının GÖRDÜĞÜ sıralamayla birebir aynıdır (bkz. utils/matchNumbering.ts).
 */
export async function recalculateUserStreak(uid: string): Promise<void> {
  const predSnap = await getDocs(query(collection(db, 'predictions'), where('userId', '==', uid)));
  const predictions = predSnap.docs.map((d) => d.data() as Prediction);

  const resolved = predictions.filter((p) => p.isCorrect !== null);
  const orderingInfo = await getMatchOrderingInfoByIds(resolved.map((p) => p.matchId));

  // ÖNEMLİ: Eğer bir tahminin bağlı olduğu maç dokümanı artık bulunamıyorsa
  // (ör. admin panelinden silinmiş/yeniden oluşturulmuşsa), o tahmin seri
  // hesaplamasına DAHİL EDİLMEZ. Eskiden böyle bir durumda boş bir kickoffAt
  // ('') değerine düşülüyordu - bu da new Date('') = Geçersiz Tarih (NaN)
  // ürettiği için sıralamayı bozup güncel serinin yanlış (genelde 0)
  // çıkmasına yol açabiliyordu.
  const ordered = resolved
    .filter((p) => orderingInfo.has(p.matchId))
    .map((p) => ({ ...p, ...orderingInfo.get(p.matchId)! }));

  const currentStreak = calculateCurrentStreak(ordered);
  const bestStreak = calculateBestStreak(ordered);
  const totalPredictions = resolved.length;
  const correctPredictions = resolved.filter((p) => p.isCorrect === true).length;

  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  const existingBadges: Badge[] = normalizeBadges(userSnap.data()?.badges);
  const currentActivityStreak = (userSnap.data()?.activityStreak as number) ?? 0;

  // Kullanıcının serisi hedefe (15) ulaştığında yeni bir rozet eklenir. Eski
  // kod "tam olarak 15" anını yakalamaya çalışıyordu (===), ama seri yeniden
  // hesaplandığında (ör. sıralama mantığı değiştiğinde, ya da birden fazla
  // maç arka arkaya hızlıca sonuçlandığında) değer 15'i atlayıp doğrudan daha
  // yükseğe çıkabiliyordu - bu da rozetin hiç verilmemesine yol açıyordu.
  // Artık ">= 15 VE bu rozet daha önce hiç verilmemiş" kontrolü yapılıyor -
  // bu, hangi şekilde 15'e ulaşılırsa ulaşılsın rozetin garantili verilmesini sağlar.
  const badges = [...existingBadges];
  const alreadyHasMatchStreakBadge = existingBadges.some((b) => b.type === 'matchStreak' && b.value === STREAK_TARGET);
  if (currentStreak >= STREAK_TARGET && !alreadyHasMatchStreakBadge) {
    badges.push({ type: 'matchStreak', value: STREAK_TARGET, achievedAt: new Date().toISOString() });
  }

  // Toplam doğru tahmin eşikleri: her eşik en fazla bir kez verilir (daha önce
  // verilmişse tekrar eklenmez), eşik aşıldıkça otomatik olarak kazanılır.
  for (const milestone of CORRECT_TOTAL_MILESTONES) {
    const alreadyHas = existingBadges.some((b) => b.type === 'correctTotal' && b.value === milestone);
    if (!alreadyHas && correctPredictions >= milestone) {
      badges.push({ type: 'correctTotal', value: milestone, achievedAt: new Date().toISOString() });
    }
  }

  // XP - her zaman GÜNCEL verilerden sıfırdan hesaplanır (bkz. xpUtils.ts).
  const xp = calculateXP({
    correctPredictions,
    totalPredictions,
    badgeCount: badges.length,
    activityStreak: currentActivityStreak,
  });

  await updateDoc(userRef, {
    currentStreak,
    bestStreak,
    totalPredictions,
    correctPredictions,
    badges,
    xp,
    updatedAt: Timestamp.now(),
  });
}
