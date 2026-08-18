import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  updateDoc,
  increment,
  query,
  where,
  getCountFromServer,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { createNotification } from '@/services/notificationCenterService';

/** Takip dokümanı ID'si - iki kullanıcı arasında en fazla bir kayıt olmasını garanti eder. */
function followDocId(followerUid: string, followedUid: string): string {
  return `${followerUid}_${followedUid}`;
}

/**
 * Bir kullanıcıyı takip eder (tek yönlü, Twitter tarzı - karşı taraf onayı gerekmez).
 * Takip edilen kullanıcıya "yeni takipçi" bildirimi düşer (bkz.
 * notificationCenterService.ts).
 * ÖNEMLİ (KOTA TASARRUFU): Takip edilen kullanıcının profilindeki
 * `followerCount` alanı burada ATOMİK olarak +1 artırılıyor (bkz.
 * firestore.rules'daki özel izin) - böylece bu sayı artık her XP
 * hesaplamasında sorgu atılarak yeniden hesaplanmıyor, doğrudan profilden
 * okunuyor. XP'nin kendisi hâlâ anlık güncellenmiyor (o hâlâ otomasyonun
 * bir sonraki çalışmasını bekliyor), ama sayının kendisi artık anlık.
 */
export async function followUser(followerUid: string, followedUid: string, followerDisplayName: string): Promise<void> {
  if (followerUid === followedUid) throw new Error('Kendini takip edemezsin.');
  await setDoc(doc(db, 'follows', followDocId(followerUid, followedUid)), {
    followerUid,
    followedUid,
    createdAt: Timestamp.now(),
  });
  await updateDoc(doc(db, 'users', followedUid), { followerCount: increment(1) }).catch(() => {});
  await createNotification(
    followedUid,
    'follow',
    '👤 Yeni Takipçi',
    `${followerDisplayName} seni takip etmeye başladı.`,
    `/oyuncu/${followerUid}`,
  ).catch(() => {});
}

/** Takibi bırakır. followerCount atomik olarak -1 azaltılır. */
export async function unfollowUser(followerUid: string, followedUid: string): Promise<void> {
  await deleteDoc(doc(db, 'follows', followDocId(followerUid, followedUid)));
  await updateDoc(doc(db, 'users', followedUid), { followerCount: increment(-1) }).catch(() => {});
}

/** Bir kullanıcının başka bir kullanıcıyı takip edip etmediğini kontrol eder. */
export async function isFollowing(followerUid: string, followedUid: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'follows', followDocId(followerUid, followedUid)));
  return snap.exists();
}

/** Bir kullanıcının takip ettiği herkesin ID listesini döner. Lig kurarken üye seçmek için kullanılır. */
export async function getFollowingUids(uid: string): Promise<string[]> {
  const snap = await getDocs(query(collection(db, 'follows'), where('followerUid', '==', uid)));
  return snap.docs.map((d) => d.data().followedUid as string);
}

/** Bir kullanıcıyı takip eden herkesin ID listesini döner. */
export async function getFollowerUids(uid: string): Promise<string[]> {
  const snap = await getDocs(query(collection(db, 'follows'), where('followedUid', '==', uid)));
  return snap.docs.map((d) => d.data().followerUid as string);
}

/** Takipçi sayısını döner (sadece sayı - kota dostu). */
export async function getFollowerCount(uid: string): Promise<number> {
  const snap = await getCountFromServer(query(collection(db, 'follows'), where('followedUid', '==', uid)));
  return snap.data().count;
}

/** Takip edilen kişi sayısını döner (sadece sayı - kota dostu). */
export async function getFollowingCount(uid: string): Promise<number> {
  const snap = await getCountFromServer(query(collection(db, 'follows'), where('followerUid', '==', uid)));
  return snap.data().count;
}
