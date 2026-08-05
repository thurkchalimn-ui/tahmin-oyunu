import { Link } from 'react-router-dom';
import { Crown, Flame, Star } from 'lucide-react';
import type { UserProfile } from '@/types';
import { Avatar } from '@/components/common/Avatar';

interface LeaderboardPodiumProps {
  topThree: UserProfile[];
}

const RANK_STYLES = [
  { order: 'order-2', ring: 'ring-scoreboard-amber', size: 'h-24 w-24', avatarSize: 'xl' as const },
  { order: 'order-1', ring: 'ring-pitch-100/40', size: 'h-16 w-16', avatarSize: 'lg' as const },
  { order: 'order-3', ring: 'ring-scoreboard-amberDark/50', size: 'h-16 w-16', avatarSize: 'lg' as const },
];

/** Liderlik tablosu sayfasının en üstündeki büyük podyum - ilk 3 kullanıcı. */
export function LeaderboardPodium({ topThree }: LeaderboardPodiumProps) {
  if (topThree.length === 0) return null;

  return (
    <div className="rounded-2xl border border-pitch-700/15 bg-gradient-to-b from-pitch-900 to-pitch-950 p-6 shadow-stadium dark:border-pitch-700">
      <div className="flex items-end justify-center gap-6">
        {topThree.map((user, i) => {
          const style = RANK_STYLES[i];
          return (
            <Link
              key={user.uid}
              to={`/oyuncu/${user.uid}`}
              className={`flex flex-col items-center gap-1.5 ${style.order}`}
            >
              <span
                className={`flex items-center gap-1 font-mono text-sm font-bold ${
                  i === 0 ? 'text-scoreboard-amber' : 'text-pitch-100/70'
                }`}
              >
                {i === 0 && <Crown size={16} />}
                {i + 1}.
              </span>
              <div className={`relative rounded-full ring-2 ${style.ring} ${style.size}`}>
                <Avatar avatarUrl={user.avatarUrl} size={style.avatarSize} />
              </div>
              <p className="mt-1 max-w-[110px] truncate text-center font-body text-sm font-semibold text-pitch-100">
                {user.displayName}
              </p>
              <p className="flex items-center gap-1 font-mono text-xs font-bold text-scoreboard-amber">
                <Star size={12} />
                {user.xp} XP
              </p>
              <p className="flex items-center gap-1 font-mono text-[11px] text-pitch-100/50">
                <Flame size={11} />
                Seri: {user.bestStreak}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
