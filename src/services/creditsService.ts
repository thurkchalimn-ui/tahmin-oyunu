import { doc, setDoc, onSnapshot, increment, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';

export const BASE_DAILY_PREDICTIONS = 5; // Her kullanıcının günlük ücretsiz hakkı
export const MAX_BONUS_CREDITS = 15; // Reklamla kazanılabilecek maksimum ekstra hak (5+15=20)

function creditsDocId(uid: string, date: string): string {
  return `${uid}_${date}`;
}

/** Kullanıcının belirli bir güne ait bonus kredi (reklamla kazanılan hak) sayısını gerçek zamanlı dinler. */
export function subscribeDailyBonusCredits(
  uid: string,
  date: string,
  onChange: (credits: number) => void,
  onError: (message: string) => void,
): () => void {
  return onSnapshot(
    doc(db, 'dailyBonusCredits', creditsDocId(uid, date)),
    (snap) => onChange(snap.exists() ? (snap.data().credits as number) : 0),
    () => onError('Bonus krediler yüklenemedi.'),
  );
}

/**
 * Reklam izleme karşılığında +1 bonus tahmin hakkı ekler.
 *
 * ÖNEMLİ: Şu an gerçek bir reklam SDK'sı (AdMob/AdSense) entegre değil - bu
 * fonksiyon "Reklam İzle" butonuna basılınca ANINDA çalışır, gerçek bir reklam
 * göstermez. Gerçek bir rewarded ads SDK'sı (ör. AdMob, Capacitor/React Native
 * köprüsü üzerinden mobilde) entegre edildiğinde, bu fonksiyon SADECE reklam
 * kullanıcı tarafından sonuna kadar izlenip "ödül kazanıldı" callback'i
 * tetiklendikten SONRA çağrılmalıdır - aksi halde reklamı atlayan kullanıcılar
 * da hak kazanmış olur.
 *
 * Güvenlik notu: Kredi artışı Firestore kuralında "her seferinde tam olarak +1,
 * en fazla 15'e kadar" şeklinde sınırlandırılmıştır (bkz. firestore.rules).
 * Ancak günlük tahmin sayısının bu limiti aşmadığını sunucu tarafında (kurallarda)
 * tam olarak doğrulamak, bir Cloud Function/transaction gerektirir; bu MVP'de
 * yalnızca istemci tarafında (arayüzde butonların kilitlenmesiyle) uygulanmaktadır.
 */
export async function earnBonusCredit(uid: string, date: string): Promise<void> {
  const ref = doc(db, 'dailyBonusCredits', creditsDocId(uid, date));
  await setDoc(ref, { userId: uid, date, credits: increment(1), createdAt: Timestamp.now() }, { merge: true });
}
