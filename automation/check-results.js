// ============================================================================
// Bu script GitHub Actions tarafından zamanlanmış olarak (örn. 5 dakikada bir)
// çalıştırılır. İki işi vardır:
//   1) Admin panelinden ELLE girilen sonuçlar için bekleyen bildirimleri gönderir
//      (notificationQueue koleksiyonu).
//   2) Maç başlamadan 30 dakika önce hatırlatma bildirimi gönderir.
//
// NOT: "Canlı skor" ve "otomatik sonuç bulma" (dış spor API'si ile) özellikleri
// buradan tamamen kaldırılmıştır - ileride ayrıca ele alınacak. Sonuçlar şu an
// SADECE admin panelinden elle giriliyor.
//
// NOT: GitHub Actions'ın ücretsiz zamanlanmış görevleri saniyesinde değil,
// birkaç dakika gecikmeli çalışabilir - bildirimler bu yüzden birkaç dakika
// gecikmeli gidebilir.
//
// Gerekli ortam değişkeni (GitHub Actions "Secrets" olarak eklenir):
//   FIREBASE_SERVICE_ACCOUNT_KEY  -> Firebase servis hesabı JSON'ının tamamı (tek satır)
// ============================================================================

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

const REMINDER_WINDOW_MS = 30 * 60 * 1000; // Maç başlamadan 30 dakika önce hatırlatma gönder

// --- Firebase Admin SDK başlatma -------------------------------------------
const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountRaw) {
  console.error('HATA: FIREBASE_SERVICE_ACCOUNT_KEY ortam değişkeni bulunamadı.');
  process.exit(1);
}
const serviceAccount = JSON.parse(serviceAccountRaw);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
const messaging = getMessaging();

/**
 * Verilen kullanıcı ID'lerine push bildirimi gönderir. Her kullanıcının
 * kayıtlı FCM token'larını (bkz. src/services/notificationService.ts,
 * users/{uid}.fcmTokens alanı) okuyup hepsine gönderir. Token artık geçersizse
 * (kullanıcı bildirimleri kapattıysa/uygulamayı kaldırdıysa) sessizce atlanır.
 */
async function sendPushToUsers(userIds, title, body) {
  for (const uid of userIds) {
    try {
      const userSnap = await db.collection('users').doc(uid).get();
      const tokens = userSnap.data()?.fcmTokens ?? [];
      if (tokens.length === 0) continue;

      const response = await messaging.sendEachForMulticast({
        tokens,
        notification: { title, body },
      });

      // Artık geçersiz olan token'ları temizle (kullanıcı izni kaldırmış/uygulamayı silmiş olabilir)
      const invalidTokens = response.responses
        .map((r, i) => (!r.success ? tokens[i] : null))
        .filter(Boolean);
      if (invalidTokens.length > 0) {
        const validTokens = tokens.filter((t) => !invalidTokens.includes(t));
        await db.collection('users').doc(uid).update({ fcmTokens: validTokens });
      }
    } catch (err) {
      console.error(`[check-results] Bildirim gönderilemedi (${uid}):`, err.message);
    }
  }
}

/**
 * Admin panelinden elle sonuç girildiğinde `notificationQueue` koleksiyonuna
 * bırakılan bekleyen bildirimleri okuyup gönderir, sonra siler.
 */
async function processNotificationQueue() {
  const snap = await db.collection('notificationQueue').get();
  if (snap.empty) return;

  for (const queueDoc of snap.docs) {
    const { userId, title, body } = queueDoc.data();
    if (userId && title) {
      await sendPushToUsers([userId], title, body ?? '');
    }
    await queueDoc.ref.delete();
  }
  console.log(`[check-results] Kuyruktaki ${snap.size} bildirim gönderildi.`);
}

async function main() {
  console.log('[check-results] Kontrol başlıyor:', new Date().toISOString());

  // --- 1) Admin panelinden elle girilen sonuçlara ait bekleyen bildirimler ---
  await processNotificationQueue();

  // --- 2) Maç başlamadan 30 dakika önce hatırlatma bildirimi ---
  const pendingSnap = await db.collection('matches').where('result', '==', null).get();
  const now = Date.now();
  const allPending = pendingSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const upcomingMatches = allPending.filter((m) => {
    if (m.reminderSent) return false; // Bu maç için hatırlatma zaten gönderildi
    const msUntilKickoff = new Date(m.kickoffAt).getTime() - now;
    return msUntilKickoff > 0 && msUntilKickoff <= REMINDER_WINDOW_MS;
  });

  for (const match of upcomingMatches) {
    const predSnap = await db.collection('predictions').where('matchId', '==', match.id).get();
    const userIds = [...new Set(predSnap.docs.map((d) => d.data().userId))];

    if (userIds.length > 0) {
      await sendPushToUsers(
        userIds,
        '⏰ Maç Yakında Başlıyor',
        `${match.homeTeam} vs ${match.awayTeam} 30 dakika içinde başlıyor!`,
      );
      console.log(`[check-results] Hatırlatma gönderildi: ${match.homeTeam} vs ${match.awayTeam} (${userIds.length} kullanıcı)`);
    }
    // Tahmin yapan kimse olmasa bile bir daha denenmesin diye işaretle
    await db.collection('matches').doc(match.id).update({ reminderSent: true });
  }

  console.log(`[check-results] Tamamlandı. ${upcomingMatches.length} maça hatırlatma kontrolü yapıldı.`);
}

main().catch((err) => {
  console.error('[check-results] Beklenmeyen hata:', err);
  process.exit(1);
});
