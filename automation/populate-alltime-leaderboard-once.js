// ============================================================================
// "Genel" liderlik önbelleğini (leaderboardCache/all) BİR KERELİĞİNE
// doldurur - otomasyonun (check-results.js) GitHub'a henüz gönderilememesi
// nedeniyle bu doküman hiç oluşmamıştı, site şu an boş liste gösteriyordu.
// Bu script, o dokümanı hemen oluşturur. Otomasyon daha sonra normal
// şekilde deploy edildiğinde, bu dokümanı periyodik olarak GÜNCELLEMEYE
// devam edecek - bu script sadece "ilk dolum" için, tekrar çalıştırmaya
// gerek yok (ama zararı da olmaz).
//
// ÇALIŞTIRMA:
//   FIREBASE_SERVICE_ACCOUNT_KEY=$(cat key.json) node populate-alltime-leaderboard-once.js
// ============================================================================

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function main() {
  const usersSnap = await db.collection('users').orderBy('xp', 'desc').get();
  const entries = usersSnap.docs.map((d) => {
    const data = d.data();
    return {
      uid: d.id,
      displayName: data.displayName ?? 'İsimsiz Oyuncu',
      avatarUrl: data.avatarUrl ?? null,
      badges: data.badges ?? [],
      totalPredictions: data.totalPredictions ?? 0,
      correctPredictions: data.correctPredictions ?? 0,
      bestStreak: data.bestStreak ?? 0,
      xp: data.xp ?? 0,
    };
  });

  await db.collection('leaderboardCache').doc('all').set({ entries, computedAt: Date.now() });
  console.log(`✅ leaderboardCache/all oluşturuldu (${entries.length} kullanıcı).`);
}

main().catch((err) => {
  console.error('HATA:', err);
  process.exit(1);
});
