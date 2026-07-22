import { NavLink } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { logoutUser } from '@/services/authService';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Button } from '@/components/common/Button';
import logo from '@/assets/logo.png';

/**
 * Uygulama genelinde görünen üst gezinme çubuğu. Sadece logo ve oturum
 * işlemlerini içerir; ana gezinme (Liderlik/Sohbet/Profil) daha mobil uygulama
 * hissi vermesi için alttaki BottomNav banner'ına taşınmıştır (bkz. BottomNav.tsx).
 */
export function Navbar() {
  const { firebaseUser } = useAuth();
  return (
    <header className="sticky top-0 z-20 border-b border-pitch-700/20 bg-pitch-100/90 backdrop-blur
      dark:border-pitch-700 dark:bg-pitch-900/90">
      <nav className="mx-auto flex max-w-4xl items-center justify-between px-4 py-1.5">
        <NavLink to="/" className="flex items-center gap-2">
          <img src={logo} alt="Tahmin Serisi" className="h-16 w-16 object-contain" />
        </NavLink>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {firebaseUser ? (
            <Button variant="ghost" onClick={() => logoutUser()} className="!px-3 !py-1.5 text-xs">
              Çıkış
            </Button>
          ) : (
            <NavLink to="/giris">
              <Button variant="primary" className="!px-3 !py-1.5 text-xs">
                Giriş Yap
              </Button>
            </NavLink>
          )}
        </div>
      </nav>
    </header>
  );
}
