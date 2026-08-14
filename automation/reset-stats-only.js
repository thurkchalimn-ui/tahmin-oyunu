// ============================================================================
// ⚠️ DİKKAT GEREKTİREN SCRIPT - GERİ ALINAMAZ (ama hesaplara dokunmaz)
//
// TÜM kullanıcıların rozetlerini, tahminlerini ve XP'sini sıfırlar.
// Hesapların kendisine (giriş bilgileri, isim, avatar) DOKUNULMAZ.
//
// SİLİNİR:
//   - TÜM tahminler (predictions)
//   - leaderboardCache (week/month) - sıfırlanır
//
// SIFIRLANIR (her kullanıcı için):
//   - currentStreak, bestStreak, totalPredictions, correctPredictions,
//     badges, xp, activityStreak → hepsi 0/boş
//
// DOKUNULMAZ:
//   - Kullanıcı hesapları (email/şifre/isim/avatar) - hiçbiri silinmez
//   - matches (maçlar), messages (sohbet), notifications (bildirimler),
//     follows (takip ilişkileri), usernames, duels
//
// ÇALIŞTIRMA (İKİ AYRI ONAY gerekir):
//   FIREBASE_SERVICE_ACCOUNT_KEY=$(cat key.json) CONFIRM_RESET=EVET-SIFIRLA node reset-stats-only.js
// ============================================================================

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import readline from 'node:readline';

const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountRaw) {
  console.error('HATA: FIREBASE_SERVICE_ACCOUNT_KEY ortam değişkeni bulunamadı.');
  process.exit(1);
}

if (process.env.CONFIRM_RESET !== 'EVET-SIFIRLA') {
  console.error(
    '\n⚠️  GÜVENLİK KİLİDİ: Bu script varsayılan olarak ÇALIŞMAZ.\n' +
      'Komutun başına şunu ekleyerek tekrar çalıştır:\n\n' +
      '  CONFIRM_RESET=EVET-SIFIRLA node reset-stats-only.js\n',
  );
  process.exit(1);
}

const serviceAccount = JSON.parse(serviceAccountRaw);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function deleteAllInCollection(collectionName) {
  const snap = await db.collection(collectionName).get();
  console.log(`[reset-stats] ${collectionName}: ${snap.size} doküman silinecek...`);
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += 450) {
    const batch = db.batch();
    docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  console.log(`[reset-stats] ${collectionName}: tamamlandı.`);
}

async function resetAllUserStats() {
  const usersSnap = await db.collection('users').get();
  console.log(`[reset-stats] users: ${usersSnap.size} kullanıcının istatistikleri sıfırlanacak (hesaplar korunuyor)...`);
  const docs = usersSnap.docs;
  for (let i = 0; i < docs.length; i += 450) {
    const batch = db.batch();
    docs.slice(i, i + 450).forEach((d) => {
      batch.update(d.ref, {
        currentStreak: 0,
        bestStreak: 0,
        totalPredictions: 0,
        correctPredictions: 0,
        badges: [],
        xp: 0,
        activityStreak: 0,
        lastActiveDateKey: null,
      });
    });
    await batch.commit();
  }
  console.log('[reset-stats] users: istatistikler sıfırlandı.');
}

async function resetLeaderboardCache() {
  await db.collection('leaderboardCache').doc('week').set({ entries: [], computedAt: Date.now() });
  await db.collection('leaderboardCache').doc('month').set({ entries: [], computedAt: Date.now() });
  console.log('[reset-stats] leaderboardCache: sıfırlandı.');
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((resolve) => {
    rl.question(
      '\n🛑 SON UYARI: TÜM kullanıcıların rozetleri, tahminleri ve XP\'si SIFIRLANACAK.\n' +
        'Hesaplar (giriş bilgileri, isim, avatar) KORUNACAK.\n' +
        'GERİ ALINAMAZ.\n\n' +
        'Devam etmek için "SIFIRLA" yazıp Enter\'a bas: ',
      (a) => {
        rl.close();
        resolve(a.trim());
      },
    );
  });
  if (answer !== 'SIFIRLA') {
    console.log('İptal edildi. Hiçbir şey silinmedi.');
    process.exit(0);
  }

  console.log('\n[reset-stats] Başlıyor...\n');

  await deleteAllInCollection('predictions');
  await resetAllUserStats();
  await resetLeaderboardCache();

  console.log('\n[reset-stats] ✅ Tamamlandı.');
}

main().catch((err) => {
  console.error('[reset-stats] HATA:', err);
  process.exit(1);
});
