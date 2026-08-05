import {
  collection,
  addDoc,
  doc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit as fbLimit,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { AppNotification, NotificationType } from '@/types';

const HISTORY_LIMIT = 50; // Zil ikonundaki listede en fazla 50 bildirim gösterilir

function mapNotificationDoc(id: string, data: Record<string, unknown>): AppNotification {
  const createdAt = data.createdAt;
  const iso = createdAt instanceof Timestamp ? createdAt.toDate().toISOString() : (createdAt as string) ?? '';
  return {
    id,
    userId: data.userId as string,
    type: data.type as NotificationType,
    title: data.title as string,
    body: data.body as string,
    isRead: (data.isRead as boolean) ?? false,
    link: (data.link as string) || null,
    createdAt: iso,
  };
}

/**
 * Bir kullanıcı için uygulama içi bildirim oluşturur. ÖNEMLİ: Bunu genelde
 * BAŞKA bir kullanıcının işlemi (ör. birini takip etme, admin'in maç sonucu
 * girmesi) tetikler - bu yüzden Firestore kuralı `create` iznini herhangi bir
 * giriş yapmış kullanıcıya açık tutuyor (bkz. firestore.rules).
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  link?: string | null,
): Promise<void> {
  await addDoc(collection(db, 'notifications'), {
    userId,
    type,
    title,
    body,
    isRead: false,
    link: link ?? null,
    createdAt: Timestamp.now(),
  });
}

/** Bir kullanıcının bildirimlerini (en yeniden en eskiye) gerçek zamanlı dinler. */
export function subscribeNotifications(
  uid: string,
  onChange: (notifications: AppNotification[]) => void,
  onError: (message: string) => void,
): () => void {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
    fbLimit(HISTORY_LIMIT),
  );
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => mapNotificationDoc(d.id, d.data()))),
    () => onError('Bildirimler yüklenemedi.'),
  );
}

/** Tek bir bildirimi okundu olarak işaretler. */
export async function markNotificationRead(notificationId: string): Promise<void> {
  await updateDoc(doc(db, 'notifications', notificationId), { isRead: true });
}

/** Verilen bildirimlerin hepsini (henüz okunmamış olanları) tek seferde okundu işaretler. */
export async function markAllNotificationsRead(notificationIds: string[]): Promise<void> {
  if (notificationIds.length === 0) return;
  const batch = writeBatch(db);
  for (const id of notificationIds) {
    batch.update(doc(db, 'notifications', id), { isRead: true });
  }
  await batch.commit();
}
