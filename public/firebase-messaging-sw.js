// Bu dosya, tarayıcı sekmesi/uygulama kapalıyken bile push bildirimlerinin
// gösterilebilmesi için gereken bir "service worker"dır. index.html'in yanına
// (public/ klasörüne) konumlandırılmalı ve tarayıcı tarafından kök dizinden
// (/firebase-messaging-sw.js) erişilebilir olmalıdır.
//
// ÖNEMLİ: Vite, bu dosyayı derleme sırasında İŞLEMEZ (public/ klasöründeki
// dosyalar olduğu gibi kopyalanır), bu yüzden .env'deki VITE_FIREBASE_...
// değişkenlerini burada OKUYAMAZ. Bu yüzden aşağıdaki değerler ELLE
// dolduruldu (src/config/firebase.ts ile birebir aynı proje). Bu değerler
// gizli değildir (Firebase web config'i tasarım gereği herkese açık olabilir,
// gerçek güvenlik firestore.rules ile sağlanır).
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');
firebase.initializeApp({
  apiKey: 'AIzaSyAZIvgH9IEooqj1dB7uJ1S1gBklT_gnlOM',
  authDomain: 'tahmin-oyunu-1ca3e.firebaseapp.com',
  projectId: 'tahmin-oyunu-1ca3e',
  storageBucket: 'tahmin-oyunu-1ca3e.firebasestorage.app',
  messagingSenderId: '633128450556',
  appId: '1:633128450556:web:235c0c6bc282b5d77a9a79',
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
