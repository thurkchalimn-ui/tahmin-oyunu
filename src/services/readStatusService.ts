import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';

/** Kullanıcı Sohbet sayfasını ziyaret ettiğinde çağrılır - kırmızı nokta kaybolur. */
export async function markChatSeen(uid: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { lastSeenChatAt: Timestamp.now(), updatedAt: Timestamp.now() });
}

/** Kullanıcı Liderlik sayfasını ziyaret ettiğinde, o anki sırasıyla birlikte çağrılır. */
export async function markLeaderboardSeen(uid: string, rank: number): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { lastSeenRank: rank, updatedAt: Timestamp.now() });
}

/** Kullanıcı Profil sayfasını ziyaret ettiğinde çağrılır - kırmızı nokta kaybolur. */
export async function markProfileSeen(uid: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { lastSeenProfileAt: Timestamp.now(), updatedAt: Timestamp.now() });
}
