import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { subscribeUserProfile } from '@/services/userService';
import type { UserProfile } from '@/types';

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Uygulama genelinde oturum durumunu, kullanıcı profilini ve admin yetkisini
 * tek noktadan sağlar. admins/{uid} dokümanının varlığına göre isAdmin belirlenir
 * (gerçek yetkilendirme her zaman firestore.rules üzerinden zorunlu kılınır).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const adminSnap = await getDoc(doc(db, 'admins', user.uid));
        setIsAdmin(adminSnap.exists());
      } else {
        setIsAdmin(false);
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;
    const unsubscribeProfile = subscribeUserProfile(
      firebaseUser.uid,
      (p) => setProfile(p),
      () => setProfile(null),
    );
    return unsubscribeProfile;
  }, [firebaseUser]);

  return (
    <AuthContext.Provider value={{ firebaseUser, profile, isAdmin, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

/** AuthContext'e erişim hook'u. Provider dışında kullanılırsa hata fırlatır. */
export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext, AuthProvider içinde kullanılmalıdır.');
  return ctx;
}
