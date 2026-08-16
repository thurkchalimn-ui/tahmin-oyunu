// ============================================================================
// Tüm düelloları (duels koleksiyonu) kalıcı olarak siler. Kullanıcılara,
// tahminlere, hesaplara DOKUNULMAZ - sadece düello kayıtları silinir.
//
// ÇALIŞTIRMA:
//   FIREBASE_SERVICE_ACCOUNT_KEY=$(cat key.json) CONFIRM_RESET=EVET-SIFIRLA node delete-all-duels.js
// ============================================================================

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountRaw) {
  console.error('HATA: FIREBASE_SERVICE_ACCOUNT_KEY ortam değişkeni bulunamadı.');
  process.exit(1);
}

if (process.env.CONFIRM_RESET !== 'EVET-SIFIRLA') {
  console.error(
    '\n⚠️  GÜVENLİK KİLİDİ: Bu script varsayılan olarak ÇALIŞMAZ.\n' +
      'Komutun başına şunu ekleyerek tekrar çalıştır:\n\n' +
      '  CONFIRM_RESET=EVET-SIFIRLA node delete-all-duels.js\n',
  );
  process.exit(1);
}

const serviceAccount = JSON.parse(serviceAccountRaw);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function main() {
  const snap = await db.collection('duels').get();
  console.log(`[delete-all-duels] ${snap.size} düello silinecek...`);

  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += 450) {
    const batch = db.batch();
    docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  console.log('[delete-all-duels] ✅ Tamamlandı.');
}

main().catch((err) => {
  console.error('[delete-all-duels] HATA:', err);
  process.exit(1);
});
