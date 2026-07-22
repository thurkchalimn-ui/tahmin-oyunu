import { NavLink } from 'react-router-dom';
import { Home, Trophy, MessageCircle, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadIndicators } from '@/hooks/useUnreadIndicators';

interface NavItem {
  to: string;
  label: string;
  Icon: typeof Home;
  end?: boolean;
  showDot?: boolean;
}

/**
 * Ekranın altına sabitlenmiş, ikon tabanlı gezinme banner'ı (mobil uygulama
 * tab bar'ı hissi verir). Ana Sayfa, Liderlik, Sohbet, Profil ve (admin ise)
 * Admin sekmelerini içerir. İlgili sekmede yeni bir şey varsa (yeni mesaj,
 * sıra değişikliği, sonuçlanan maç) kırmızı bir nokta gösterilir.
 */
export function BottomNav() {
  const { firebaseUser, isAdmin } = useAuth();
  const { hasChatUnread, hasRankChange, hasProfileUnread } = useUnreadIndicators();

  const items: NavItem[] = [
    { to: '/', label: 'Ana Sayfa', Icon: Home, end: true },
    { to: '/liderlik', label: 'Liderlik', Icon: Trophy, showDot: hasRankChange },
    { to: '/sohbet', label: 'Sohbet', Icon: MessageCircle, showDot: hasChatUnread },
  ];
  if (firebaseUser) items.push({ to: '/profil', label: 'Profil', Icon: User, showDot: hasProfileUnread });
  if (isAdmin) items.push({ to: '/admin', label: 'Admin', Icon: ShieldCheck });

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-pitch-700/20 bg-pitch-100/95
        backdrop-blur dark:border-pitch-700 dark:bg-pitch-900/95"
      aria-label="Ana gezinme"
    >
      <div className="mx-auto flex max-w-4xl items-stretch justify-around">
        {items.map(({ to, label, Icon, end, showDot }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-mono transition-colors ${
                isActive
                  ? 'text-scoreboard-amber'
                  : 'text-pitch-700/60 hover:text-scoreboard-amber dark:text-pitch-100/50'
              }`
            }
          >
            <span className="relative">
              <Icon className="h-5 w-5" strokeWidth={2} />
              {showDot && (
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-pick-wrong ring-2 ring-pitch-100 dark:ring-pitch-900" />
              )}
            </span>
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
