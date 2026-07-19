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
 * Bir maç sonucu girildikten sonra çağrılır: kullanıcının tüm sonuçlanmış
 * tahminlerini kronolojik sıraya göre yeniden değerlendirir, güncel seriyi,
 * en iyi seriyi ve 15'lik hedefe ulaşıldıysa yeni rozeti hesaplayıp kaydeder.
 */
export async function recalculateUserStreak(uid: string): Promise<void> {
  const predSnap = await getDocs(query(collection(db, 'predictions'), where('userId', '==', uid)));
  const predictions = predSnap.docs.map((d) => d.data() as Prediction);

  const currentStreak = calculateCurrentStreak(predictions);
  const bestStreak = calculateBestStreak(predictions);
  const totalPredictions = predictions.filter((p) => p.isCorrect !== null).length;
  const correctPredictions = predictions.filter((p) => p.isCorrect === true).length;

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
