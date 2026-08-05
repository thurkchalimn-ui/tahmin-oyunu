// ============================================================================
// TEK SEFERLİK SCRIPT: Tüm mevcut kullanıcıların XP'sini geriye dönük olarak
// hesaplayıp Firestore'a yazar.
//
// NEDEN GEREKLİ: XP sistemi eklendiğinde, XP sadece bir kullanıcının profili
// bir şekilde güncellendiğinde (bir tahmini sonuçlandığında ya da günlük
// giriş yaptığında) hesaplanıp yazılıyor. Bu yüzden XP eklenmeden ÖNCE
// tahmin yapmış ama o tarihten beri hiçbir yeni aktivitesi olmayan
// kullanıcıların `xp` alanı Firestore'da hiç YOK - ve Firestore'un
// `orderBy('xp')` sorgusu, bu alanı hiç olmayan dokümanları sessizce
// SIRALAMA DIŞI bırakıyor. Bu script, TÜM kullanıcılar için XP'yi mevcut
// verilerinden (correctPredictions, totalPredictions, badges, activityStreak)
// hesaplayıp yazarak bu sorunu kalıcı olarak çözer.
//
// ÇALIŞTIRMA: Bilgisayarında, `automation` klasöründeyken:
//   node backfill-xp.js
// (aynı FIREBASE_SERVICE_ACCOUNT_KEY ortam değişkenine ihtiyaç duyar - eğer
// yerelde çalıştırıyorsan, terminalde önce şunu çalıştır:
//   export FIREBASE_SERVICE_ACCOUNT_KEY='{...servis hesabı JSON içeriği...}'
// ya da GitHub Actions'ta "workflow_dispatch" ile elle tetiklenen geçici bir
// iş olarak da çalıştırılabilir.)
// ============================================================================

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountRaw) {
  console.error('HATA: FIREBASE_SERVICE_ACCOUNT_KEY ortam değişkeni bulunamadı.');
  process.exit(1);
}
const serviceAccount = JSON.parse(serviceAccountRaw);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

/** userService.ts'deki xpUtils.ts ile BİREBİR AYNI formül. */
function calculateXP({ correctPredictions, totalPredictions, badgeCount, activityStreak }) {
  const wrongPredictions = Math.max(0, totalPredictions - correctPredictions);
  return correctPredictions * 10 + wrongPredictions * 2 + badgeCount * 50 + activityStreak * 5;
}

async function backfillXP() {
  console.log('[backfill-xp] Tüm kullanıcılar okunuyor...');
  const usersSnap = await db.collection('users').get();
  console.log(`[backfill-xp] ${usersSnap.size} kullanıcı bulundu.`);

  let updated = 0;
  let skipped = 0;

  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();

    // Zaten gerçek bir xp değeri varsa (0'dan büyük) dokunma - üzerine yazmak
    // yerine sadece EKSİK olanları tamamlıyoruz. xp === 0 olanlar da (henüz
    // hiç tahmin yapmamış yeni kullanıcılar) zaten doğru, onlara da dokunmaya
    // gerek yok ama zararı olmadığı için yeniden hesaplamak güvenli.
    const correctPredictions = data.correctPredictions ?? 0;
    const totalPredictions = data.totalPredictions ?? 0;
    const badgeCount = Array.isArray(data.badges) ? data.badges.length : 0;
    const activityStreak = data.activityStreak ?? 0;

    const xp = calculateXP({ correctPredictions, totalPredictions, badgeCount, activityStreak });

    if (data.xp === xp) {
      skipped += 1;
      continue;
    }

    await userDoc.ref.update({ xp });
    updated += 1;
    console.log(`[backfill-xp]   ${data.displayName ?? userDoc.id}: xp=${xp}`);
  }

  console.log(`[backfill-xp] Tamamlandı. ${updated} kullanıcı güncellendi, ${skipped} zaten günceldi.`);
}

backfillXP().catch((err) => {
  console.error('[backfill-xp] HATA:', err);
  process.exit(1);
});
