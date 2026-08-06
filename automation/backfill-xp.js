// ============================================================================
// TEK SEFERLİK SCRIPT: Tüm mevcut kullanıcıların XP'sini GÜNCEL formüle göre
// yeniden hesaplayıp Firestore'a yazar.
//
// NE ZAMAN ÇALIŞTIRILIR: XP formülü değiştiğinde (ör. seri rozetlerinin
// ağırlıklandırılması, takipçi/davet XP'si eklenmesi gibi) - normal akışta
// (bir tahmin sonuçlandığında/günlük girişte) zaten otomatik güncellenir,
// ama formül değiştiğinde MEVCUT kullanıcıların XP'si eski formülle
// hesaplanmış olarak kalır. Bu script hepsini GÜNCEL formülle yeniden hesaplar.
//
// ÇALIŞTIRMA: `automation` klasöründeyken:
//   FIREBASE_SERVICE_ACCOUNT_KEY=$(cat key.json) node backfill-xp.js
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

/**
 * src/utils/xpUtils.ts ile BİREBİR AYNI formül. Oyunun adı "Tahmin Serisi"
 * olduğu için seri rozetleri (matchStreak) eşikle orantılı XP verir
 * (eşik × 10), diğer rozetler sabit +50 XP verir.
 */
function calculateXP({ correctPredictions, totalPredictions, badges, activityStreak, followerCount, inviteCount }) {
  const wrongPredictions = Math.max(0, totalPredictions - correctPredictions);
  const badgeXP = badges.reduce((sum, b) => sum + (b.type === 'matchStreak' ? b.value * 10 : 50), 0);
  return (
    correctPredictions * 10 +
    wrongPredictions * 2 +
    badgeXP +
    activityStreak * 5 +
    followerCount * 5 +
    inviteCount * 50
  );
}

async function backfillXP() {
  console.log('[backfill-xp] Tüm kullanıcılar okunuyor...');
  const usersSnap = await db.collection('users').get();
  console.log(`[backfill-xp] ${usersSnap.size} kullanıcı bulundu.`);

  let updated = 0;
  let skipped = 0;

  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();

    const correctPredictions = data.correctPredictions ?? 0;
    const totalPredictions = data.totalPredictions ?? 0;
    const badges = Array.isArray(data.badges) ? data.badges : [];
    const activityStreak = data.activityStreak ?? 0;

    const followerCountSnap = await db.collection('follows').where('followedUid', '==', userDoc.id).count().get();
    const followerCount = followerCountSnap.data().count;

    const inviteCountSnap = await db.collection('users').where('invitedByUid', '==', userDoc.id).count().get();
    const inviteCount = inviteCountSnap.data().count;

    const xp = calculateXP({ correctPredictions, totalPredictions, badges, activityStreak, followerCount, inviteCount });

    if (data.xp === xp) {
      skipped += 1;
      continue;
    }

    await userDoc.ref.update({ xp });
    updated += 1;
    console.log(`[backfill-xp]   ${data.displayName ?? userDoc.id}: xp=${xp} (öncekiydi: ${data.xp ?? 0})`);
  }

  console.log(`[backfill-xp] Tamamlandı. ${updated} kullanıcı güncellendi, ${skipped} zaten günceldi.`);
}

backfillXP().catch((err) => {
  console.error('[backfill-xp] HATA:', err);
  process.exit(1);
});
