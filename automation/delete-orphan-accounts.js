// ============================================================================
// Belirtilen (Authentication'da var ama Firestore profili OLMAYAN) "yarım
// kalmış" hesapları siler - bu, o e-postalarla TEMİZ bir şekilde yeniden
// kayıt olabilmeyi sağlar.
//
// ÇALIŞTIRMA:
//   FIREBASE_SERVICE_ACCOUNT_KEY=$(cat key.json) CONFIRM_RESET=EVET-SIFIRLA node delete-orphan-accounts.js
// ============================================================================

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import readline from 'node:readline';

const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountRaw) {
  console.error('HATA: FIREBASE_SERVICE_ACCOUNT_KEY ortam değişkeni bulunamadı.');
  process.exit(1);
}
if (process.env.CONFIRM_RESET !== 'EVET-SIFIRLA') {
  console.error(
    '\n⚠️  GÜVENLİK KİLİDİ: CONFIRM_RESET=EVET-SIFIRLA ekleyerek tekrar çalıştır.\n',
  );
  process.exit(1);
}

const serviceAccount = JSON.parse(serviceAccountRaw);
initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth();
const db = getFirestore();

// Doğrulanmış "yarım kalmış" hesaplar (Authentication var, Firestore profili yok)
const orphanUids = ['yD608mfOYoXuCtKGIunMNaR3C4K3', 'sKOGqOdO3nOJooUsAv6O1FowEsf2'];
const orphanEmails = ['thurk16@hotmail.com', 'turkercalim@gmail.com'];

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((resolve) => {
    rl.question(
      `\n🛑 SON UYARI:\nŞu hesaplar KALICI OLARAK silinecek:\n` +
        orphanEmails.map((e, i) => `  - ${e} (uid=${orphanUids[i]})`).join('\n') +
        `\n\nBunlar Firestore profili olmayan "yarım kalmış" hesaplar - gerçek veri kaybı olmayacak.\n` +
        `Devam etmek için "SIFIRLA" yazıp Enter'a bas: `,
      (a) => {
        rl.close();
        resolve(a.trim());
      },
    );
  });
  if (answer !== 'SIFIRLA') {
    console.log('İptal edildi.');
    process.exit(0);
  }

  for (const uid of orphanUids) {
    // Güvenlik: Firestore profili GERÇEKTEN yoksa sil - varsa dokunma
    const doc = await db.collection('users').doc(uid).get();
    if (doc.exists) {
      console.log(`[delete-orphan-accounts] ⚠️  ${uid} - Firestore profili VAR, atlanıyor (güvenlik).`);
      continue;
    }
    await auth.deleteUser(uid);
    console.log(`[delete-orphan-accounts] ✅ ${uid} silindi.`);
  }

  console.log('\n[delete-orphan-accounts] ✅ Tamamlandı. Artık bu e-postalarla yeniden kayıt olunabilir.');
}

main().catch((err) => {
  console.error('[delete-orphan-accounts] HATA:', err);
  process.exit(1);
});
