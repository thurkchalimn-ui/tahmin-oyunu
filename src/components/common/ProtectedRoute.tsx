import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

/** Giriş yapılmamışsa /giris'e, admin gerekiyorsa ve yetki yoksa /'ye yönlendirir. */
export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { firebaseUser, isAdmin, loading } = useAuth();

  if (loading) return <LoadingSpinner fullScreen label="Oturum kontrol ediliyor..." />;
  if (!firebaseUser) return <Navigate to="/giris" replace />;
  if (requireAdmin && !isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
}
