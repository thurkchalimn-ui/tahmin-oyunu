import {
  collection,
  addDoc,
  deleteDoc,
  doc,
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
const QUOTE_SNIPPET_LENGTH = 120; // Alıntılanan mesajın kısaltılacağı karakter sayısı

function mapMessageDoc(id: string, data: Record<string, unknown>): ChatMessage {
  const createdAt = data.createdAt;
  const iso = createdAt instanceof Timestamp ? createdAt.toDate().toISOString() : (createdAt as string) ?? '';
  const replyTo = data.replyTo as { messageId: string; displayName: string; text: string } | undefined;
  return {
    id,
    userId: data.userId as string,
    displayName: (data.displayName as string) ?? 'İsimsiz Oyuncu',
    avatarUrl: (data.avatarUrl as string) || null,
    text: data.text as string,
    isAdmin: (data.isAdmin as boolean) ?? false,
    replyTo: replyTo ?? null,
    createdAt: iso,
  };
}

/**
 * Sohbet kanalına yeni bir mesaj gönderir. `replyTo` verilirse, alıntılanan
 * mesajın kısa bir özeti (kimin yazdığı + metnin ilk ~120 karakteri) yeni
 * mesajla birlikte kalıcı olarak kaydedilir - böylece alıntılanan orijinal
 * mesaj daha sonra silinse bile alıntı görünmeye devam eder.
 */
export async function sendMessage(
  userId: string,
  displayName: string,
  text: string,
  isAdmin: boolean,
  avatarUrl?: string | null,
  replyTo?: { messageId: string; displayName: string; text: string } | null,
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Boş mesaj gönderilemez.');
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Mesaj en fazla ${MAX_MESSAGE_LENGTH} karakter olabilir.`);
  }
  await addDoc(collection(db, 'messages'), {
    userId,
    displayName,
    avatarUrl: avatarUrl || null,
    text: trimmed,
    isAdmin,
    replyTo: replyTo
      ? {
          messageId: replyTo.messageId,
          displayName: replyTo.displayName,
          text: replyTo.text.slice(0, QUOTE_SNIPPET_LENGTH),
        }
      : null,
    createdAt: Timestamp.now(),
  });
}

/** Admin: bir mesajı sohbetten kalıcı olarak siler (bkz. firestore.rules - sadece admin silebilir). */
export async function deleteMessage(messageId: string): Promise<void> {
  await deleteDoc(doc(db, 'messages', messageId));
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
