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

/** Yeni kullanıcı kaydı oluşturur, doğrulama e-postası gönderir ve users/{uid} profil dokümanını başlatır. */
export async function registerUser(
  email: string,
  password: string,
  displayName: string,
): Promise<void> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName });

  // Kullanıcının e-postasının gerçekten kendisine ait olduğunu doğrulamak için
  // bir onay linki gönderilir. Doğrulanana kadar tahmin yapamaz (bkz. firestore.rules
  // ve HomePage'deki emailVerified kontrolü).
  await sendEmailVerification(credential.user);

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
