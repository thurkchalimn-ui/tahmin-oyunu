// ============================================================================
// Belirtilen e-posta adreslerinin Firebase Authentication'da kayıtlı olup
// olmadığını ve varsa hangi Firestore kullanıcı profiline bağlı olduğunu
// gösterir. SADECE OKUR, hiçbir şey silmez/değiştirmez.
//
// ÇALIŞTIRMA:
//   FIREBASE_SERVICE_ACCOUNT_KEY=$(cat key.json) node check-emails.js
// ============================================================================

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountRaw) {
  console.error('HATA: FIREBASE_SERVICE_ACCOUNT_KEY ortam değişkeni bulunamadı.');
  process.exit(1);
}

const serviceAccount = JSON.parse(serviceAccountRaw);
initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth();
const db = getFirestore();

const emailsToCheck = ['thurk16@hotmail.com', 'turkercalim@gmail.com'];

async function main() {
  for (const email of emailsToCheck) {
    console.log(`\n--- ${email} ---`);
    try {
      const userRecord = await auth.getUserByEmail(email);
      console.log(`✅ Authentication'da KAYITLI:`);
      console.log(`   uid: ${userRecord.uid}`);
      console.log(`   Oluşturulma: ${userRecord.metadata.creationTime}`);
      console.log(`   Son giriş: ${userRecord.metadata.lastSignInTime}`);
      console.log(`   E-posta doğrulanmış mı: ${userRecord.emailVerified}`);
      console.log(`   Sağlayıcılar: ${userRecord.providerData.map((p) => p.providerId).join(', ')}`);

      const userDoc = await db.collection('users').doc(userRecord.uid).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        console.log(`   Firestore profili VAR: displayName="${data.displayName}", xp=${data.xp}`);
      } else {
        console.log(`   ⚠️  Firestore profili YOK (Authentication hesabı var ama profil dokümanı eksik).`);
      }
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        console.log('❌ Authentication\'da KAYITLI DEĞİL.');
      } else {
        console.log(`HATA: ${err.message}`);
      }
    }
  }
}

main().catch((err) => {
  console.error('[check-emails] HATA:', err);
  process.exit(1);
});
