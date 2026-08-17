// ============================================================================
// `xp` alanı HİÇ olmayan (undefined) kullanıcıları bulup düzeltir. Firestore'un
// orderBy('xp') sorgusu, bu alanı hiç olmayan dokümanları otomatik olarak
// SONUÇLARIN DIŞINDA bırakıyor - "7 kullanıcı var ama liderlikte 6 görünüyor"
// sorununun kök nedeni tam olarak bu. Bu script, eksik olan kullanıcı(lar)ı
// bulup gerçek XP'lerini hesaplayıp yazıyor.
//
// GÜVENLİDİR - sadece `xp` alanı hiç olmayanlara dokunur, zaten xp'si olan
// kullanıcılara (0 dahil) hiç dokunmaz.
//
// ÇALIŞTIRMA:
//   FIREBASE_SERVICE_ACCOUNT_KEY=$(cat key.json) node backfill-missing-xp.js
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

async function main() {
  const usersSnap = await db.collection('users').get();
  console.log(`[backfill-missing-xp] ${usersSnap.size} kullanıcı taranıyor...`);

  let fixedCount = 0;

  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    if (data.xp !== undefined) continue; // Zaten xp'si var (0 bile olsa) - atla

    console.log(`[backfill-missing-xp] ⚠️  ${userDoc.id} (${data.displayName ?? 'isimsiz'}) - xp alanı HİÇ YOK, hesaplanıyor...`);

    const followerCountSnap = await db.collection('follows').where('followedUid', '==', userDoc.id).count().get();
    const followerCount = followerCountSnap.data().count;
    const inviteCountSnap = await db.collection('users').where('invitedByUid', '==', userDoc.id).count().get();
    const inviteCount = inviteCountSnap.data().count;
    const bonusXp = data.bonusXp || 0;

    const xp =
      calculateXP({
        correctPredictions: data.correctPredictions ?? 0,
        totalPredictions: data.totalPredictions ?? 0,
        badges: Array.isArray(data.badges) ? data.badges : [],
        activityStreak: data.activityStreak ?? 0,
        followerCount,
        inviteCount,
      }) + bonusXp;

    await userDoc.ref.update({ xp });
    console.log(`[backfill-missing-xp] ✅ ${userDoc.id}: xp=${xp} olarak ayarlandı.`);
    fixedCount += 1;
  }

  if (fixedCount === 0) {
    console.log('[backfill-missing-xp] Eksik xp alanına sahip kullanıcı bulunamadı - her şey zaten düzgün.');
  }
  console.log(`[backfill-missing-xp] ✅ Tamamlandı. ${fixedCount} kullanıcı düzeltildi.`);
}

main().catch((err) => {
  console.error('[backfill-missing-xp] HATA:', err);
  process.exit(1);
});
