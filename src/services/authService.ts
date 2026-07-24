import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
  type User,
} from 'firebase/auth';
import { doc, setDoc, deleteDoc, getDocs, collection, query, where, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { isUsernameTaken, claimUsername, releaseUsername } from '@/services/usernameService';
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

/** Verilen e-postaya şifre sıfırlama linki gönderir. */
export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

/**
 * Kullanıcının hesabını kalıcı olarak siler: önce şifresiyle yeniden kimlik
 * doğrulaması yapılır (Firebase, güvenlik gereği hesap silmeden önce yakın
 * zamanlı bir giriş ister), sonra kendi tahminleri ve kullanıcı adı kilidi
 * silinir, en son da Firebase Authentication hesabının kendisi silinir.
 *
 * Not: Sohbet mesajları ve liderlik geçmişi (başka kullanıcıların gördüğü
 * genel istatistikler) bu MVP'de silinmez - sadece kişisel hesap erişimi ve
 * kendi tahmin geçmişi kaldırılır. Tam bir "unutulma hakkı" uygulaması için
 * bu kapsam genişletilebilir.
 */
export async function deleteAccount(password: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('Oturum bulunamadı, lütfen tekrar giriş yap.');

  const credential = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, credential);

  const displayName = user.displayName ?? '';

  const predSnap = await getDocs(query(collection(db, 'predictions'), where('userId', '==', user.uid)));
  await Promise.all(predSnap.docs.map((d) => deleteDoc(d.ref)));

  if (displayName) {
    await releaseUsername(displayName).catch(() => {});
  }

  await deleteDoc(doc(db, 'users', user.uid)).catch(() => {});

  await deleteUser(user);
}
