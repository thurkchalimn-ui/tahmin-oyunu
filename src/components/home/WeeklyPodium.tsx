import { Link } from 'react-router-dom';
import { Crown } from 'lucide-react';
import { Avatar } from '@/components/common/Avatar';
import { IconBadge } from '@/components/common/IconBadge';
import { LevelBadge } from '@/components/common/LevelBadge';
import type { UserProfile } from '@/types';

interface WeeklyPodiumProps {
  topThree: UserProfile[];
  source: 'week' | 'all';
}

const RANK_STYLES = [
  { order: 'order-2', ring: 'ring-scoreboard-amber', size: 'h-[102px] w-[102px]', avatarSize: 'xl' as const },
  { order: 'order-1', ring: 'ring-pitch-100/40', size: 'h-14 w-14', avatarSize: 'lg' as const },
  { order: 'order-3', ring: 'ring-scoreboard-amberDark/50', size: 'h-14 w-14', avatarSize: 'lg' as const },
];

/**
 * Ana sayfadaki liderlik önizlemesi - ilk 3 kullanıcıyı podyum düzeninde
 * gösterir. `source` haftalık mı yoksa (hafta yeni başlayıp veri azken)
 * tüm-zamanlar mı gösterildiğini belirtir - başlık buna göre değişir.
 * Kullanıcı adının altında EN İYİ SERİ (bestStreak) gösterilir - bu bilgi
 * hook seviyesinde (useWeeklyTopThree) ayrıca `users` koleksiyonundan
 * tamamlanıyor, çünkü hem haftalık önbellek hem basit tüm-zamanlar sorgusu
 * bu alanı içermiyordu.
 */
export function WeeklyPodium({ topThree, source }: WeeklyPodiumProps) {
  if (topThree.length === 0) return null;

  return (
    <section className="rounded-xl border border-pitch-700/15 bg-gradient-to-b from-white to-pitch-100 p-4 shadow-stadium dark:border-pitch-700 dark:from-pitch-800 dark:to-pitch-900">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="flex min-w-0 items-center gap-2 font-display text-sm font-semibold text-pitch-900 dark:text-pitch-100">
          <IconBadge icon={<Crown size={16} />} size="sm" />
          <span className="truncate">{source === 'week' ? 'Haftalık Liderlik' : 'Genel Liderlik'}</span>
        </h2>
        <Link to="/liderlik" className="shrink-0 font-mono text-xs text-scoreboard-amber hover:underline">
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
              {/* Sıra numarası artık avatarın ÜZERİNE binmiyor - ayrı, kendi
                  satırında, avatarın hemen üstünde duran bir etiket */}
              <span
                className={`flex items-center gap-1 font-mono text-sm font-bold ${
                  i === 0
                    ? 'text-scoreboard-amber'
                    : 'text-pitch-700/70 dark:text-pitch-100/60'
                }`}
              >
                {i === 0 && <Crown size={14} />}
                {i + 1}.
              </span>
              <div className={`relative rounded-full ring-2 ${style.ring} ${style.size}`}>
                <Avatar avatarUrl={user.avatarUrl} size={style.avatarSize} />
              </div>
              <p className="mt-1 max-w-[90px] truncate text-center font-body text-xs font-medium text-pitch-900 dark:text-pitch-100">
                {user.displayName}
              </p>
              <LevelBadge xp={user.xp} size="sm" />
              <p className="font-mono text-[10px] text-pitch-700/50 dark:text-pitch-100/40">
                {user.xp} XP
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
