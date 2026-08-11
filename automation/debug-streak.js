// ============================================================================
// TEK SEFERLİK TEŞHİS SCRIPT'İ: Bir kullanıcının TÜM tahmin geçmişini,
// gerçek kickoffAt sırasına göre dizip ekrana döker - "seri neden 0 çıkıyor"
// sorusunu KESİN olarak cevaplamak için (hangi maçtan sonra serinin
// kesildiğini birebir gösterir).
//
// ÇALIŞTIRMA:
//   FIREBASE_SERVICE_ACCOUNT_KEY=$(cat key.json) node debug-streak.js <UID>
// ============================================================================

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountRaw) {
  console.error('HATA: FIREBASE_SERVICE_ACCOUNT_KEY ortam değişkeni bulunamadı.');
  process.exit(1);
}
const uid = process.argv[2];
if (!uid) {
  console.error('HATA: Kullanıcı ID\'sini komutun sonuna ekle: node debug-streak.js <UID>');
  process.exit(1);
}

const serviceAccount = JSON.parse(serviceAccountRaw);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function debugStreak() {
  console.log(`[debug-streak] Kullanıcı: ${uid}\n`);

  const predSnap = await db.collection('predictions').where('userId', '==', uid).get();
  const predictions = predSnap.docs.map((d) => d.data());
  console.log(`[debug-streak] Toplam tahmin: ${predictions.length}`);

  const resolved = predictions.filter((p) => p.isCorrect !== null);
  console.log(`[debug-streak] Sonuçlanmış tahmin: ${resolved.length}\n`);

  // Her tahminin maçını bul, kickoffAt ile birlikte
  const enriched = [];
  for (const p of resolved) {
    const matchSnap = await db.collection('matches').doc(p.matchId).get();
    if (!matchSnap.exists) {
      console.log(`  ⚠️  matchId=${p.matchId} - MAÇ BULUNAMADI (yetim tahmin!)`);
      continue;
    }
    const matchData = matchSnap.data();
    const kickoffAt = matchData.kickoffAt;
    const kickoffDate = kickoffAt?.toDate ? kickoffAt.toDate() : new Date(kickoffAt);
    enriched.push({
      matchId: p.matchId,
      homeTeam: matchData.homeTeam,
      awayTeam: matchData.awayTeam,
      kickoffAt: kickoffDate,
      isCorrect: p.isCorrect,
      choice: p.choice,
      result: matchData.result,
    });
  }

  // kickoffAt'e göre kronolojik sırala (eskiden yeniye)
  enriched.sort((a, b) => a.kickoffAt.getTime() - b.kickoffAt.getTime());

  console.log('[debug-streak] Kronolojik sıra (eskiden yeniye):\n');
  enriched.forEach((e, i) => {
    const mark = e.isCorrect ? '✅' : '❌';
    console.log(
      `  ${i + 1}. ${e.kickoffAt.toISOString()} - ${e.homeTeam} vs ${e.awayTeam} - Tahminin: ${e.choice}, Sonuç: ${e.result} - ${mark}`,
    );
  });

  // Güncel seriyi elle hesapla (en sondan geriye doğru, ilk yanlışa kadar say)
  let currentStreak = 0;
  for (let i = enriched.length - 1; i >= 0; i--) {
    if (enriched[i].isCorrect) currentStreak++;
    else break;
  }

  console.log(`\n[debug-streak] Hesaplanan GÜNCEL SERİ: ${currentStreak}`);
}

debugStreak().catch((err) => {
  console.error('[debug-streak] HATA:', err);
  process.exit(1);
});
