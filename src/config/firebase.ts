import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase yapılandırması .env dosyasından okunur; API anahtarları asla
// koda gömülmez (bkz. .env.example). Eksik değişken varsa erken uyarı verilir.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  // Geliştirici için erken ve anlaşılır bir uyarı (sessiz başarısızlık yerine)
  // eslint-disable-next-line no-console
  console.error(
    '[firebase] Ortam değişkenleri eksik. .env.example dosyasını .env olarak kopyalayıp ' +
      'Firebase proje bilgilerinizi girin.',
  );
}

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Admin e-postaları: sadece istemci tarafı UI kontrolü içindir (menü göster/gizle).
// Gerçek yetkilendirme her zaman firestore.rules'daki `admins` koleksiyonundan gelir.
export const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);
