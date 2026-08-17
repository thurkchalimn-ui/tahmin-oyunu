import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth();
const db = getFirestore();

const email = 'thurk16@hotmail.com';

async function main() {
  try {
    const userRecord = await auth.getUserByEmail(email);
    console.log(`✅ Authentication'da KAYITLI:`);
    console.log(`   uid: ${userRecord.uid}`);
    console.log(`   Oluşturulma: ${userRecord.metadata.creationTime}`);
    console.log(`   E-posta doğrulanmış mı: ${userRecord.emailVerified}`);

    const userDoc = await db.collection('users').doc(userRecord.uid).get();
    if (userDoc.exists) {
      const data = userDoc.data();
      console.log(`✅ Firestore profili VAR:`);
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(`❌ Firestore profili YOK - uid: ${userRecord.uid}`);
    }
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      console.log('❌ Authentication\'da hiç KAYITLI DEĞİL.');
    } else {
      console.log(`HATA: ${err.message}`);
    }
  }
}

main();
