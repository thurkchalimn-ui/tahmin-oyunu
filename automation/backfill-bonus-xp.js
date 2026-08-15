// ============================================================================
// TEK SEFERLİK GEÇİŞ SCRIPT'İ - sosyal medya takip XP'sini kalıcı `bonusXp`
// alanına taşır. socialFollowClaimed'i olan ama henüz bonusXp'si olmayan
// (ya da yanlış hesaplanmış) kullanıcılar için bonusXp'yi doğru şekilde
// ayarlar ve xp'yi buna göre yeniden hesaplar. GÜVENLİDİR - birden fazla kez
// çalıştırılsa bile sonuç değişmez (idempotent).
//
// ÇALIŞTIRMA:
//   FIREBASE_SERVICE_ACCOUNT_KEY=$(cat key.json) node backfill-bonus-xp.js
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

function calculateBaseXP({ correctPredictions, totalPredictions, badges, activityStreak, followerCount, inviteCount }) {
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
  console.log(`[backfill-bonus-xp] ${usersSnap.size} kullanıcı kontrol ediliyor...`);

  let updatedCount = 0;

  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    const socialFollowClaimed = data.socialFollowClaimed || {};
    const claimedCount = Object.values(socialFollowClaimed).filter(Boolean).length;
    const correctBonusXp = claimedCount * 25;
    const currentBonusXp = data.bonusXp || 0;

    if (currentBonusXp === correctBonusXp && data.bonusXp !== undefined) continue; // Zaten doğru, atla

    const followerCountSnap = await db.collection('follows').where('followedUid', '==', userDoc.id).count().get();
    const followerCount = followerCountSnap.data().count;
    const inviteCountSnap = await db.collection('users').where('invitedByUid', '==', userDoc.id).count().get();
    const inviteCount = inviteCountSnap.data().count;

    const baseXp = calculateBaseXP({
      correctPredictions: data.correctPredictions ?? 0,
      totalPredictions: data.totalPredictions ?? 0,
      badges: Array.isArray(data.badges) ? data.badges : [],
      activityStreak: data.activityStreak ?? 0,
      followerCount,
      inviteCount,
    });

    const newXp = baseXp + correctBonusXp;

    await userDoc.ref.update({ bonusXp: correctBonusXp, xp: newXp });
    updatedCount += 1;
    console.log(`[backfill-bonus-xp] ${userDoc.id}: bonusXp=${correctBonusXp}, xp=${newXp}`);
  }

  console.log(`[backfill-bonus-xp] ✅ Tamamlandı. ${updatedCount} kullanıcı güncellendi.`);
}

main().catch((err) => {
  console.error('[backfill-bonus-xp] HATA:', err);
  process.exit(1);
});
