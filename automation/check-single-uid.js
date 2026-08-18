import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth();
const db = getFirestore();

const UID = 'ZahmRRDwKLgrDJlwfMXD1QXj0nl1';

async function main() {
  try {
    const userRecord = await auth.getUser(UID);
    console.log(`✅ Authentication'da KAYITLI:`);
    console.log(`   email: ${userRecord.email}`);
    console.log(`   Oluşturulma: ${userRecord.metadata.creationTime}`);
    console.log(`   E-posta doğrulanmış mı: ${userRecord.emailVerified}`);
  } catch (err) {
    console.log(`❌ Authentication'da bulunamadı: ${err.message}`);
    return;
  }

  const userDoc = await db.collection('users').doc(UID).get();
  if (userDoc.exists) {
    console.log(`✅ Firestore profili VAR:`);
    console.log(JSON.stringify(userDoc.data(), null, 2));
  } else {
    console.log(`❌ Firestore profili YOK.`);
  }
}

main().catch((err) => console.error('HATA:', err.message));
