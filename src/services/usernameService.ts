import { doc, getDoc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';

/** Kullanıcı adını, tutarlı bir Firestore doküman ID'sine çevirir. */
function normalizeUsername(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Verilen kullanıcı adının başka biri tarafından alınıp alınmadığını kontrol eder.
 * `excludeUid` verilirse, o kullanıcının kendi mevcut adını değiştirmeden
 * bırakabilmesi için kendi kaydı "alınmış" sayılmaz.
 */
export async function isUsernameTaken(displayName: string, excludeUid?: string): Promise<boolean> {
  const key = normalizeUsername(displayName);
  if (!key) return false;
  const snap = await getDoc(doc(db, 'usernames', key));
  if (!snap.exists()) return false;
  return snap.data().uid !== excludeUid;
}

/**
 * Bir kullanıcı adını, verilen kullanıcıya kilitler. Firestore kuralı, aynı
 * isim başka biri tarafından zaten alınmışsa bu yazmayı reddeder (bkz.
 * firestore.rules - `usernames` koleksiyonu) - bu yüzden burada başarısız
 * olursa gerçekten "isim alınmış" anlamına gelir, sadece istemci tarafı
 * kontrolüne güvenilmez.
 */
export async function claimUsername(uid: string, displayName: string): Promise<void> {
  const key = normalizeUsername(displayName);
  await setDoc(doc(db, 'usernames', key), {
    uid,
    displayName: displayName.trim(),
    claimedAt: Timestamp.now(),
  });
}

/** Bir kullanıcı adının kilidini kaldırır (kullanıcı adını değiştirdiğinde eski adı serbest bırakmak için). */
export async function releaseUsername(displayName: string): Promise<void> {
  const key = normalizeUsername(displayName);
  if (!key) return;
  try {
    await deleteDoc(doc(db, 'usernames', key));
  } catch {
    // Zaten silinmiş veya hiç var olmamış olabilir - göz ardı et.
  }
}
