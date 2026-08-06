import { Link } from 'react-router-dom';
import { Crown, Flame, Star, CheckCircle2 } from 'lucide-react';
import type { UserProfile } from '@/types';
import { Avatar } from '@/components/common/Avatar';

interface LeaderboardPodiumProps {
  topThree: UserProfile[];
  /** 'all': XP + en iyi seri gösterilir. 'period': o döneme ait doğru tahmin sayısı gösterilir
      (dönemsel önbellek gerçek XP/bestStreak İÇERMEZ - bu yüzden mod ayrımı şart). */
  mode?: 'all' | 'period';
}

const RANK_STYLES = [
  { order: 'order-2', ring: 'ring-scoreboard-amber', size: 'h-[102px] w-[102px]', avatarSize: 'xl' as const },
  { order: 'order-1', ring: 'ring-pitch-700/20 dark:ring-pitch-100/40', size: 'h-14 w-14', avatarSize: 'lg' as const },
  { order: 'order-3', ring: 'ring-scoreboard-amberDark/50', size: 'h-14 w-14', avatarSize: 'lg' as const },
];

/**
 * Liderlik tablosu sayfasının en üstündeki büyük podyum - ilk 3 kullanıcı.
 * ÖNEMLİ: Arka plan artık açık modda beyaz, koyu modda pitch tonlarında -
 * önceden `dark:` öneki olmadan sabit koyu renk kullanıldığı için açık moda
 * geçildiğinde bile koyu kalıyordu. İçerideki metin renkleri de buna göre
 * güncellendi (beyaz zeminde okunaklı olacak şekilde).
 *
 * Ayrıca: Haftalık/Aylık sekmelerinde (mode='period') veri kaynağı olan
 * dönemsel önbellek gerçek XP/bestStreak tutmuyor (sadece o döneme ait
 * doğru/toplam tahmin sayısını tutuyor) - bu yüzden o modda XP/Seri yerine
 * "X doğru" gösterilir, aksi halde alan boş/0 görünürdü.
 */
export function LeaderboardPodium({ topThree, mode = 'all' }: LeaderboardPodiumProps) {
  if (topThree.length === 0) return null;

  return (
    <div className="rounded-2xl border border-pitch-700/15 bg-gradient-to-b from-white to-pitch-100 p-6 shadow-stadium dark:border-pitch-700 dark:from-pitch-900 dark:to-pitch-950">
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
                  i === 0 ? 'text-scoreboard-amber' : 'text-pitch-700/70 dark:text-pitch-100/70'
                }`}
              >
                {i === 0 && <Crown size={16} />}
                {i + 1}.
              </span>
              <div className={`relative rounded-full ring-2 ${style.ring} ${style.size}`}>
                <Avatar avatarUrl={user.avatarUrl} size={style.avatarSize} />
              </div>
              <p className="mt-1 max-w-[110px] truncate text-center font-body text-sm font-semibold text-pitch-900 dark:text-pitch-100">
                {user.displayName}
              </p>
              {mode === 'all' ? (
                <>
                  <p className="flex items-center gap-1 font-mono text-xs font-bold text-scoreboard-amber">
                    <Star size={12} />
                    {user.xp} XP
                  </p>
                  <p className="flex items-center gap-1 font-mono text-[11px] text-pitch-700/50 dark:text-pitch-100/50">
                    <Flame size={11} />
                    Seri: {user.bestStreak}
                  </p>
                </>
              ) : (
                <p className="flex items-center gap-1 font-mono text-xs font-bold text-scoreboard-amber">
                  <CheckCircle2 size={12} />
                  {user.correctPredictions} doğru
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
