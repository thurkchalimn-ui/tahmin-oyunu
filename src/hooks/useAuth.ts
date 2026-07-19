import { useAuthContext } from '@/context/AuthContext';

/** Bileşenlerde kimlik doğrulama durumuna erişmek için kısayol hook. */
export function useAuth() {
  return useAuthContext();
}
