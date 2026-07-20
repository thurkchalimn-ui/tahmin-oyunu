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
export async function updateDisplayName(uid: string, displayName: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { displayName, updatedAt: Timestamp.now() });
}

/**
 * Verilen maç ID'lerinin `kickoffAt` (başlama saati) değerlerini toplu olarak getirir.
 * matchService.ts'deki benzer fonksiyonun küçük bir kopyasıdır; matchService zaten bu
 * dosyadaki recalculateUserStreak'i çağırdığı için döngüsel import'tan kaçınmak amacıyla
 * burada ayrıca (ve sade şekilde) tanımlanmıştır.
 */
async function getKickoffTimesByMatchIds(matchIds: string[]): Promise<Map<string, string>> {
  const uniqueIds = Array.from(new Set(matchIds));
  const result = new Map<string, string>();
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
        const kickoffAt = d.data().kickoffAt;
        const iso = kickoffAt instanceof Timestamp ? kickoffAt.toDate().toISOString() : (kickoffAt as string);
        result.set(d.id, iso ?? '');
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
 * `kickoffAt` saatine göre yapılır. Aksi halde admin maçları farklı bir sırayla
 * eklerse (örn. önce geç saatli bir maçı, sonra erken saatli bir maçı eklerse)
 * seri yanlış hesaplanır.
 */
export async function recalculateUserStreak(uid: string): Promise<void> {
  const predSnap = await getDocs(query(collection(db, 'predictions'), where('userId', '==', uid)));
  const predictions = predSnap.docs.map((d) => d.data() as Prediction);

  const resolved = predictions.filter((p) => p.isCorrect !== null);
  const kickoffByMatchId = await getKickoffTimesByMatchIds(resolved.map((p) => p.matchId));

  const ordered = resolved
    .map((p) => ({ ...p, kickoffAt: kickoffByMatchId.get(p.matchId) ?? '' }))
    .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());

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
