import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendEmailVerification,
  type User,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { isUsernameTaken, claimUsername } from '@/services/usernameService';
import { containsProfanity } from '@/utils/profanityFilter';

/** Yeni kullanıcı kaydı oluşturur, doğrulama e-postası gönderir ve users/{uid} profil dokümanını başlatır. */
export async function registerUser(
  email: string,
  password: string,
  displayName: string,
): Promise<void> {
  if (containsProfanity(displayName)) {
    throw new Error('Kullanıcı adında uygunsuz bir kelime var, lütfen başka bir isim seç.');
  }
  if (await isUsernameTaken(displayName)) {
    throw new Error('Bu kullanıcı adı zaten alınmış, lütfen başka bir isim dene.');
  }

  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName });

  // Kullanıcının e-postasının gerçekten kendisine ait olduğunu doğrulamak için
  // bir onay linki gönderilir. Doğrulanana kadar tahmin yapamaz (bkz. firestore.rules
  // ve HomePage'deki emailVerified kontrolü).
  await sendEmailVerification(credential.user);

  // Kullanıcı adını kilitle - Firestore kuralı, bu isim başka biri tarafından
  // aynı anda alınmışsa bu yazmayı reddeder (gerçek güvence burada, üstteki
  // isUsernameTaken kontrolü sadece hızlı bir ön kontrol/UX içindir).
  await claimUsername(credential.user.uid, displayName);

  // Yeni kullanıcı için başlangıç profil dokümanı (seri istatistikleri sıfırdan başlar)
  await setDoc(doc(db, 'users', credential.user.uid), {
    uid: credential.user.uid,
    email,
    displayName,
    currentStreak: 0,
    bestStreak: 0,
    totalPredictions: 0,
    correctPredictions: 0,
    badges: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** Doğrulama e-postasını tekrar gönderir (kullanıcı ilk maili kaçırdıysa/silerse). */
export async function resendVerificationEmail(user: User): Promise<void> {
  await sendEmailVerification(user);
}

/** E-posta/şifre ile giriş yapar. */
export async function loginUser(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password);
}

/** Oturumu kapatır. */
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}
