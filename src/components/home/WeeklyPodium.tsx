import { Link } from 'react-router-dom';
import { Avatar } from '@/components/common/Avatar';
import type { UserProfile } from '@/types';

interface WeeklyPodiumProps {
  topThree: UserProfile[];
}

const RANK_STYLES = [
  { order: 'order-2', ring: 'ring-scoreboard-amber', size: 'h-16 w-16', badge: '👑', badgeColor: 'bg-scoreboard-amber text-pitch-950' },
  { order: 'order-1', ring: 'ring-pitch-100/40', size: 'h-12 w-12', badge: '2', badgeColor: 'bg-pitch-100 text-pitch-900' },
  { order: 'order-3', ring: 'ring-scoreboard-amberDark/50', size: 'h-12 w-12', badge: '3', badgeColor: 'bg-scoreboard-amberDark text-white' },
];

/** Ana sayfadaki haftalık liderlik önizlemesi - ilk 3 kullanıcıyı podyum düzeninde gösterir. */
export function WeeklyPodium({ topThree }: WeeklyPodiumProps) {
  if (topThree.length === 0) return null;

  return (
    <section className="rounded-xl border border-pitch-700/15 bg-gradient-to-b from-white to-pitch-100 p-4 shadow-stadium dark:border-pitch-700 dark:from-pitch-800 dark:to-pitch-900">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold text-pitch-900 dark:text-pitch-100">
          🏆 Haftalık Liderlik
        </h2>
        <Link to="/liderlik" className="font-mono text-xs text-scoreboard-amber hover:underline">
          Tümünü Gör →
        </Link>
      </div>

      <div className="flex items-end justify-center gap-4">
        {topThree.map((user, i) => {
          const style = RANK_STYLES[i];
          return (
            <Link
              key={user.uid}
              to={`/oyuncu/${user.uid}`}
              className={`flex flex-col items-center gap-1.5 ${style.order}`}
            >
              <div className={`relative rounded-full ring-2 ${style.ring} ${style.size}`}>
                <Avatar avatarUrl={user.avatarUrl} size={i === 0 ? 'lg' : 'md'} />
                <span
                  className={`absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full px-1.5 py-0.5
                    font-mono text-[10px] font-bold ${style.badgeColor}`}
                >
                  {style.badge}
                </span>
              </div>
              <p className="mt-1 max-w-[80px] truncate text-center font-body text-xs font-medium text-pitch-900 dark:text-pitch-100">
                {user.displayName}
              </p>
              <p className="font-mono text-[10px] text-pitch-700/50 dark:text-pitch-100/40">
                {user.correctPredictions} doğru
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
