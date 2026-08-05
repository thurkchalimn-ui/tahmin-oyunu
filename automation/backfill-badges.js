// ============================================================================
// TEK SEFERLİK SCRIPT: Tüm mevcut kullanıcılara, GENİŞLETİLMİŞ rozet eşiklerine
// (bkz. userService.ts) göre eksik kalan rozetleri geriye dönük olarak verir.
//
// NEDEN GEREKLİ: Rozet eşikleri sonradan genişletildi (ör. seri rozetleri
// eskiden sadece 15'te veriliyordu, şimdi 3/5/10/15/20/30/50/100 eşiklerinin
// hepsinde veriliyor). Ama rozet verme mantığı sadece YENİ bir olayda (yeni
// bir tahmin sonuçlandığında, ya da günlük girişte) çalışıyor - bu yüzden
// zaten bestStreak=17 olan ama bu genişletme ÖNCESİNDE 17'ye ulaşmış bir
// kullanıcı, "3 Doğru", "5 Doğru", "10 Doğru", "15 Doğru" rozetlerini hiç
// almamış oluyor (sadece yeni bir seri başlatıp tekrar 17'ye ulaşırsa alır).
// Bu script, herkesin GÜNCEL istatistiklerine (bestStreak, activityStreak,
// correctPredictions) bakıp eksik kalan tüm rozetleri tamamlar, ardından
// XP'yi de (rozet sayısı değiştiği için) yeniden hesaplar.
//
// ÇALIŞTIRMA: backfill-xp.js ile birebir aynı şekilde - `automation`
// klasöründeyken:
//   FIREBASE_SERVICE_ACCOUNT_KEY=$(cat key.json) node backfill-badges.js
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

// userService.ts / badgeCatalog.tsx ile BİREBİR AYNI eşik listeleri.
const MATCH_STREAK_MILESTONES = [3, 5, 10, 15, 20, 30, 50, 100];
const ACTIVITY_STREAK_MILESTONES = [3, 7, 15, 30, 60, 100, 365];
const CORRECT_TOTAL_MILESTONES = [50, 100, 250, 500, 1000, 2500, 5000];

/** xpUtils.ts ile BİREBİR AYNI formül. */
function calculateXP({ correctPredictions, totalPredictions, badgeCount, activityStreak }) {
  const wrongPredictions = Math.max(0, totalPredictions - correctPredictions);
  return correctPredictions * 10 + wrongPredictions * 2 + badgeCount * 50 + activityStreak * 5;
}

async function backfillBadges() {
  console.log('[backfill-badges] Tüm kullanıcılar okunuyor...');
  const usersSnap = await db.collection('users').get();
  console.log(`[backfill-badges] ${usersSnap.size} kullanıcı bulundu.`);

  let updated = 0;
  let skipped = 0;

  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    const badges = Array.isArray(data.badges) ? [...data.badges] : [];
    const bestStreak = data.bestStreak ?? 0;
    const activityStreak = data.activityStreak ?? 0;
    const correctPredictions = data.correctPredictions ?? 0;
    const totalPredictions = data.totalPredictions ?? 0;

    let addedCount = 0;
    const nowIso = new Date().toISOString();

    for (const milestone of MATCH_STREAK_MILESTONES) {
      const already = badges.some((b) => b.type === 'matchStreak' && b.value === milestone);
      if (!already && bestStreak >= milestone) {
        badges.push({ type: 'matchStreak', value: milestone, achievedAt: nowIso });
        addedCount += 1;
      }
    }
    for (const milestone of ACTIVITY_STREAK_MILESTONES) {
      const already = badges.some((b) => b.type === 'activityStreak' && b.value === milestone);
      if (!already && activityStreak >= milestone) {
        badges.push({ type: 'activityStreak', value: milestone, achievedAt: nowIso });
        addedCount += 1;
      }
    }
    for (const milestone of CORRECT_TOTAL_MILESTONES) {
      const already = badges.some((b) => b.type === 'correctTotal' && b.value === milestone);
      if (!already && correctPredictions >= milestone) {
        badges.push({ type: 'correctTotal', value: milestone, achievedAt: nowIso });
        addedCount += 1;
      }
    }

    if (addedCount === 0) {
      skipped += 1;
      continue;
    }

    const xp = calculateXP({
      correctPredictions,
      totalPredictions,
      badgeCount: badges.length,
      activityStreak,
    });

    await userDoc.ref.update({ badges, xp });
    updated += 1;
    console.log(
      `[backfill-badges]   ${data.displayName ?? userDoc.id}: +${addedCount} rozet (toplam ${badges.length}), xp=${xp}`,
    );
  }

  console.log(`[backfill-badges] Tamamlandı. ${updated} kullanıcı güncellendi, ${skipped} zaten güncel.`);
}

backfillBadges().catch((err) => {
  console.error('[backfill-badges] HATA:', err);
  process.exit(1);
});
