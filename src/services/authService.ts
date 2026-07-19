import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';

/** Yeni kullanıcı kaydı oluşturur ve users/{uid} profil dokümanını başlatır. */
export async function registerUser(
  email: string,
  password: string,
  displayName: string,
): Promise<void> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName });

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

/** E-posta/şifre ile giriş yapar. */
export async function loginUser(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password);
}

/** Oturumu kapatır. */
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}
