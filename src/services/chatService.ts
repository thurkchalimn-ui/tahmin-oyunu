import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit as fbLimit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { ChatMessage } from '@/types';

export const MAX_MESSAGE_LENGTH = 500;
const MESSAGE_HISTORY_LIMIT = 100; // Sadece son 100 mesaj yüklenir (performans için)

function mapMessageDoc(id: string, data: Record<string, unknown>): ChatMessage {
  const createdAt = data.createdAt;
  const iso = createdAt instanceof Timestamp ? createdAt.toDate().toISOString() : (createdAt as string) ?? '';
  return {
    id,
    userId: data.userId as string,
    displayName: (data.displayName as string) ?? 'İsimsiz Oyuncu',
    text: data.text as string,
    isAdmin: (data.isAdmin as boolean) ?? false,
    createdAt: iso,
  };
}

/** Sohbet kanalına yeni bir mesaj gönderir. */
export async function sendMessage(
  userId: string,
  displayName: string,
  text: string,
  isAdmin: boolean,
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Boş mesaj gönderilemez.');
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Mesaj en fazla ${MAX_MESSAGE_LENGTH} karakter olabilir.`);
  }
  await addDoc(collection(db, 'messages'), {
    userId,
    displayName,
    text: trimmed,
    isAdmin,
    createdAt: Timestamp.now(),
  });
}

/**
 * Sadece en son mesajın zamanını dinler (tüm mesajları çekmeden). BottomNav'daki
 * "yeni mesaj var" kırmızı noktasını hafif bir sorguyla güncel tutmak için kullanılır.
 */
export function subscribeLatestMessageTime(onChange: (iso: string | null) => void): () => void {
  const q = query(collection(db, 'messages'), orderBy('createdAt', 'desc'), fbLimit(1));
  return onSnapshot(
    q,
    (snap) => {
      if (snap.empty) {
        onChange(null);
        return;
      }
      const data = snap.docs[0].data();
      const createdAt = data.createdAt;
      const iso = createdAt instanceof Timestamp ? createdAt.toDate().toISOString() : (createdAt as string);
      onChange(iso ?? null);
    },
    () => onChange(null),
  );
}

/** Son mesajları gerçek zamanlı dinler (en eski en üstte olacak şekilde döner). */
export function subscribeMessages(
  onChange: (messages: ChatMessage[]) => void,
  onError: (message: string) => void,
): () => void {
  const q = query(collection(db, 'messages'), orderBy('createdAt', 'desc'), fbLimit(MESSAGE_HISTORY_LIMIT));
  return onSnapshot(
    q,
    (snap) => {
      const messages = snap.docs.map((d) => mapMessageDoc(d.id, d.data()));
      messages.reverse(); // en yeni-önce sorgudan gelir, ekranda en eski-önce göstereceğiz
      onChange(messages);
    },
    () => onError('Sohbet mesajları yüklenemedi.'),
  );
}
