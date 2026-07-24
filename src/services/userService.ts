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

/** Firestore Timestamp alanlarını ISO string'e çevirerek UserProfile'a dönüştürür. */
function mapUserDoc(id: string, data: Record<string, unknown>): UserProfile {
  const toIso = (v: unknown) => (v instanceof Timestamp ? v.toDate().toISOString() : (v as string) ?? '');
  return {
    uid: id,
    email: (data.email as string) ?? '',
    displayName: (data.displayName as string) ?? 'İsimsiz Oyuncu',
    currentStreak: (data.currentStreak as number) ?? 0,
    bestStreak: (data.bestStreak as number) ?? 0,
    totalPredictions: (data.totalPredictions as number) ?? 0,
    correctPredictions: (data.correctPredictions as number) ?? 0,
    badges: (data.badges as Badge[]) ?? [],
    isAdmin: false, // AuthContext içinde admins koleksiyonuna göre ayrıca belirlenir
    lastSeenChatAt: data.lastSeenChatAt ? toIso(data.lastSeenChatAt) : null,
    lastSeenRank: (data.lastSeenRank as number | undefined) ?? null,
    lastSeenProfileAt: data.lastSeenProfileAt ? toIso(data.lastSeenProfileAt) : null,
    avatarUrl: (data.avatarUrl as string) || null,
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

/** Liderlik tablosunu en yüksek "bestStreak" değerine göre gerçek zamanlı dinler. */
export function subscribeLeaderboard(
  onChange: (users: UserProfile[]) => void,
  onError: (message: string) => void,
  topN = 50,
): () => void {
  const q = query(collection(db, 'users'), orderBy('bestStreak', 'desc'), fbLimit(topN));
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
 * kronolojik sıraya dizip yeniden değerlendirir, güncel seriyi, en iyi seriyi
 * ve 15'lik hedefe ulaşıldıysa yeni rozeti hesaplayıp kaydeder.
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

  const ordered = resolved.map((p) => ({
    ...p,
    ...(orderingInfo.get(p.matchId) ?? { kickoffAt: '', homeTeam: '' }),
  }));

  const currentStreak = calculateCurrentStreak(ordered);
  const bestStreak = calculateBestStreak(ordered);
  const totalPredictions = resolved.length;
  const correctPredictions = resolved.filter((p) => p.isCorrect === true).length;

  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  const existingBadges: Badge[] = (userSnap.data()?.badges as Badge[]) ?? [];

  // Kullanıcının serisi tam olarak hedefe (15) ulaştığı anda yeni bir rozet eklenir.
  // Bu fonksiyon her çağrıldığında currentStreak, tüm sonuçlanmış tahminlerden yeniden
  // ve deterministik olarak hesaplandığı için (bkz. calculateCurrentStreak), değer
  // sadece "15. doğru tahmin az önce çözüldü" anında tam 15 olabilir; bir sonraki doğru
  // tahminde 16'ya çıkar, yanlışta 0'a döner. Bu yüzden ek bir tekrar kontrolüne gerek yoktur.
  const badges = [...existingBadges];
  if (currentStreak === STREAK_TARGET) {
    badges.push({ streakLength: STREAK_TARGET, achievedAt: new Date().toISOString() });
  }

  await updateDoc(userRef, {
    currentStreak,
    bestStreak,
    totalPredictions,
    correctPredictions,
    badges,
    updatedAt: Timestamp.now(),
  });
}
