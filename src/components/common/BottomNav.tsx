import { NavLink } from 'react-router-dom';
import { Home, Trophy, MessageCircle, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
  to: string;
  label: string;
  Icon: typeof Home;
  end?: boolean;
}

/**
 * Ekranın altına sabitlenmiş, ikon tabanlı gezinme banner'ı (mobil uygulama
 * tab bar'ı hissi verir). Ana Sayfa, Liderlik, Sohbet, Profil ve (admin ise)
 * Admin sekmelerini içerir.
 */
export function BottomNav() {
  const { firebaseUser, isAdmin } = useAuth();

  const items: NavItem[] = [
    { to: '/', label: 'Ana Sayfa', Icon: Home, end: true },
    { to: '/liderlik', label: 'Liderlik', Icon: Trophy },
    { to: '/sohbet', label: 'Sohbet', Icon: MessageCircle },
  ];
  if (firebaseUser) items.push({ to: '/profil', label: 'Profil', Icon: User });
  if (isAdmin) items.push({ to: '/admin', label: 'Admin', Icon: ShieldCheck });

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-pitch-700/20 bg-pitch-100/95
        backdrop-blur dark:border-pitch-700 dark:bg-pitch-900/95"
      aria-label="Ana gezinme"
    >
      <div className="mx-auto flex max-w-4xl items-stretch justify-around">
        {items.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-mono transition-colors ${
                isActive
                  ? 'text-scoreboard-amber'
                  : 'text-pitch-700/60 hover:text-scoreboard-amber dark:text-pitch-100/50'
              }`
            }
          >
            <Icon className="h-5 w-5" strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
