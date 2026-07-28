// Bu dosya, tarayıcı sekmesi/uygulama kapalıyken bile push bildirimlerinin
// gösterilebilmesi için gereken bir "service worker"dır. index.html'in yanına
// (public/ klasörüne) konumlandırılmalı ve tarayıcı tarafından kök dizinden
// (/firebase-messaging-sw.js) erişilebilir olmalıdır.
//
// ÖNEMLİ: Vite, bu dosyayı derleme sırasında İŞLEMEZ (public/ klasöründeki
// dosyalar olduğu gibi kopyalanır), bu yüzden .env'deki VITE_FIREBASE_...
// değişkenlerini burada OKUYAMAZ. Aşağıdaki firebaseConfig değerlerini kendi
// .env dosyandaki değerlerle ELLE doldurman gerekiyor. Bu değerler gizli
// değildir (Firebase web config'i tasarım gereği herkese açık olabilir).
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'BURAYA_.ENV_DOSYANDAKI_VITE_FIREBASE_API_KEY_DEĞERİNİ_YAPIŞTIR',
  authDomain: 'BURAYA_.ENV_DOSYANDAKI_VITE_FIREBASE_AUTH_DOMAIN_DEĞERİNİ_YAPIŞTIR',
  projectId: 'BURAYA_.ENV_DOSYANDAKI_VITE_FIREBASE_PROJECT_ID_DEĞERİNİ_YAPIŞTIR',
  storageBucket: 'BURAYA_.ENV_DOSYANDAKI_VITE_FIREBASE_STORAGE_BUCKET_DEĞERİNİ_YAPIŞTIR',
  messagingSenderId: 'BURAYA_.ENV_DOSYANDAKI_VITE_FIREBASE_MESSAGING_SENDER_ID_DEĞERİNİ_YAPIŞTIR',
  appId: 'BURAYA_.ENV_DOSYANDAKI_VITE_FIREBASE_APP_ID_DEĞERİNİ_YAPIŞTIR',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  // ÖNEMLİ: `payload.notification` DEĞİL `payload.data` okunuyor. Sunucu
  // tarafı bilinçli olarak `notification` alanını KULLANMIYOR (bkz.
  // automation/check-results.js) - çünkü o alan gönderilirse tarayıcı
  // bildirimi OTOMATİK gösteriyor, bu da buradaki elle gösterimle birleşip
  // aynı mesaj için 2 bildirim çıkmasına yol açıyordu.
  const title = payload.data?.title ?? 'Tahmin Serisi';
  const body = payload.data?.body ?? '';
  self.registration.showNotification(title, {
    body,
    icon: '/favicon.svg',
  });
});
