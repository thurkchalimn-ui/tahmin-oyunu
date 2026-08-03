import { Link } from 'react-router-dom';
import { Crown } from 'lucide-react';
import { Avatar } from '@/components/common/Avatar';
import { IconBadge } from '@/components/common/IconBadge';
import type { UserProfile } from '@/types';

interface WeeklyPodiumProps {
  topThree: UserProfile[];
  source: 'week' | 'all';
}

const RANK_STYLES = [
  { order: 'order-2', ring: 'ring-scoreboard-amber', size: 'h-44 w-44', avatarSize: '2xl' as const, badgeColor: 'bg-scoreboard-amber text-pitch-950' },
  { order: 'order-1', ring: 'ring-pitch-100/40', size: 'h-24 w-24', avatarSize: 'xl' as const, badgeColor: 'bg-pitch-100 text-pitch-900' },
  { order: 'order-3', ring: 'ring-scoreboard-amberDark/50', size: 'h-24 w-24', avatarSize: 'xl' as const, badgeColor: 'bg-scoreboard-amberDark text-white' },
];

/**
 * Ana sayfadaki liderlik önizlemesi - ilk 3 kullanıcıyı podyum düzeninde
 * gösterir. `source` haftalık mı yoksa (hafta yeni başlayıp veri azken)
 * tüm-zamanlar mı gösterildiğini belirtir - başlık buna göre değişir.
 */
export function WeeklyPodium({ topThree, source }: WeeklyPodiumProps) {
  if (topThree.length === 0) return null;

  return (
    <section className="rounded-xl border border-pitch-700/15 bg-gradient-to-b from-white to-pitch-100 p-4 shadow-stadium dark:border-pitch-700 dark:from-pitch-800 dark:to-pitch-900">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-pitch-900 dark:text-pitch-100">
          <IconBadge icon={<Crown size={16} />} size="sm" />
          {source === 'week' ? 'Haftalık Liderlik' : 'Genel Liderlik'}
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
                <Avatar avatarUrl={user.avatarUrl} size={style.avatarSize} />
                <span
                  className={`absolute -bottom-1 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center
                    justify-center rounded-full font-mono text-sm font-bold ${style.badgeColor}`}
                >
                  {i === 0 ? <Crown size={16} /> : i + 1}
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
