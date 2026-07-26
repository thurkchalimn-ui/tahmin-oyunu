import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { app, db } from '@/config/firebase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
// Bir kullanıcı için saklanacak en fazla token sayısı. Farklı cihazlar (telefon +
// bilgisayar gibi) meşru şekilde birden fazla token biriktirebilir, ama bu bir
// üst sınır olmadan, her deploy/servis-worker güncellemesinde yeni bir token
// üretilip sonsuza kadar eklenebiliyordu (arrayUnion asla eskiyi silmiyordu) -
// bu da aynı bildirimin onlarca kez gönderilmesine yol açtı. Artık en fazla
// son 5 token tutulur, daha eskiler otomatik olarak düşer.
const MAX_TOKENS_PER_USER = 5;

export type PushPermissionResult = 'granted' | 'denied' | 'unsupported' | 'error';

/**
 * Tarayıcıdan bildirim izni ister; verilirse bir FCM (Firebase Cloud Messaging)
 * token'ı alır ve kullanıcının profil dokümanına kaydeder. Gerçek gönderim,
 * bu token'ı okuyan GitHub Actions otomasyon script'i (Admin SDK ile, bkz.
 * automation/check-results.js) tarafından yapılır - istemci başka bir
 * kullanıcıya doğrudan push gönderemez.
 */
export async function enablePushNotifications(uid: string): Promise<PushPermissionResult> {
  try {
    const supported = await isSupported();
    if (!supported) return 'unsupported';

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return 'denied';

    // Zaten kayıtlı bir service worker varsa onu kullan, yoksa yeni kaydet -
    // her seferinde gereksiz yeniden kayıt yapmak, token'ın gereksiz yere
    // değişmesine (ve eskisinin "hayalet" olarak birikmesine) katkıda bulunuyordu.
    const registration =
      (await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')) ??
      (await navigator.serviceWorker.register('/firebase-messaging-sw.js'));
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      const userRef = doc(db, 'users', uid);
      const snap = await getDoc(userRef);
      const existing = (snap.data()?.fcmTokens as string[] | undefined) ?? [];
      // Bu token zaten listede varsa çıkar (tekrar en sona eklenip "en taze" sayılsın),
      // sonra ekle ve en fazla MAX_TOKENS_PER_USER kadarını (en yenilerini) tut.
      const deduped = existing.filter((t) => t !== token);
      const updated = [...deduped, token].slice(-MAX_TOKENS_PER_USER);
      await updateDoc(userRef, { fcmTokens: updated });
    }
    return 'granted';
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[notificationService] Bildirim izni alınamadı:', err);
    return 'error';
  }
}
