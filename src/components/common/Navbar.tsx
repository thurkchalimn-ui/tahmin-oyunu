import { NavLink } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { logoutUser } from '@/services/authService';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Button } from '@/components/common/Button';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `font-display text-sm uppercase tracking-wide transition-colors ${
    isActive
      ? 'text-scoreboard-amber'
      : 'text-pitch-700 hover:text-scoreboard-amber dark:text-pitch-100'
  }`;

/** Uygulama genelinde görünen üst gezinme çubuğu; oturum durumuna göre linkler değişir. */
export function Navbar() {
  const { firebaseUser, isAdmin } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-pitch-700/20 bg-pitch-100/90 backdrop-blur
      dark:border-pitch-700 dark:bg-pitch-900/90">
      <nav className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <NavLink to="/" className="font-display text-lg font-semibold text-pitch-900 dark:text-pitch-100">
          Tahmin<span className="text-scoreboard-amber">Serisi</span>
        </NavLink>

        <div className="flex items-center gap-5">
          <NavLink to="/" className={navLinkClass} end>
            Bugün
          </NavLink>
          <NavLink to="/liderlik" className={navLinkClass}>
            Liderlik
          </NavLink>
          <NavLink to="/sohbet" className={navLinkClass}>
            Sohbet
          </NavLink>
          {firebaseUser && (
            <NavLink to="/profil" className={navLinkClass}>
              Profil
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/admin" className={navLinkClass}>
              Admin
            </NavLink>
          )}
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
