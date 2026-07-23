import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, messagingPromise } from '@/config/firebase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

/** Service worker'ı, Firebase config'i URL query string olarak taşıyarak kaydeder (bkz. public/firebase-messaging-sw.js). */
function buildServiceWorkerUrl(): string {
  const params = new URLSearchParams({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  });
  return `/firebase-messaging-sw.js?${params.toString()}`;
}

export type PushPermissionResult = 'granted' | 'denied' | 'unsupported' | 'error';

/**
 * Kullanıcıdan bildirim izni ister; izin verilirse bir FCM token'ı alıp
 * kullanıcının Firestore dokümanındaki `fcmTokens` dizisine ekler (aynı token
 * tekrar eklenmez - arrayUnion). Uygulama açıkken (foreground) gelen
 * bildirimleri de tarayıcı bildirimi olarak göstermeye başlar - kapalıyken/arka
 * plandayken gösterilmesi service worker tarafından (bkz.
 * public/firebase-messaging-sw.js) otomatik yapılır.
 *
 * Tarayıcı push bildirimlerini desteklemiyorsa (ör. bazı eski tarayıcılar,
 * iOS'ta ana ekrana eklenmemiş Safari sekmesi) 'unsupported' döner. Beklenmeyen
 * bir hata oluşursa (ör. service worker kaydı başarısız olursa) 'error' döner.
 */
export async function enablePushNotifications(uid: string): Promise<PushPermissionResult> {
  const messaging = await messagingPromise;
  if (!messaging || !('serviceWorker' in navigator)) return 'unsupported';

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';

  try {
    const registration = await navigator.serviceWorker.register(buildServiceWorkerUrl());
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    if (!token) return 'error';

    await updateDoc(doc(db, 'users', uid), { fcmTokens: arrayUnion(token) });

    onMessage(messaging, (payload) => {
      const title = payload.notification?.title;
      const body = payload.notification?.body;
      if (title && Notification.permission === 'granted') {
        // eslint-disable-next-line no-new
        new Notification(title, { body, icon: '/favicon.svg' });
      }
    });

    return 'granted';
  } catch {
    return 'error';
  }
}
