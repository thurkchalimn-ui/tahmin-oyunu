import { Crown } from 'lucide-react';
import { getLevelInfo } from '@/utils/xpUtils';

interface LevelBadgeProps {
  xp: number;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * "Seviye N" + XP ilerleme çubuğunu gösteren ortak bileşen. Profil, Ana
 * Sayfa, Liderlik ve Sohbet gibi XP'nin görüneceği her yerde kullanılır -
 * tek bir yerden güncellenip her yerde tutarlı kalması için.
 */
export function LevelBadge({ xp, size = 'md' }: LevelBadgeProps) {
  const { level, xpIntoLevel, xpForNextLevel, progress } = getLevelInfo(xp);

  if (size === 'sm') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-scoreboard-amber/15 px-2 py-0.5 font-mono text-[10px] font-bold text-scoreboard-amberDark dark:text-scoreboard-amber">
        <Crown size={10} />
        Sv {level}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 rounded-full bg-scoreboard-amber/15 px-3 py-1 font-mono text-xs font-bold text-scoreboard-amberDark dark:text-scoreboard-amber">
          <Crown size={13} />
          Seviye {level}
        </span>
        <span className="font-mono text-[11px] text-pitch-700/60 dark:text-pitch-100/50">
          {xpIntoLevel} / {xpForNextLevel} XP
        </span>
      </div>
      {size === 'lg' && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-pitch-700/10 dark:bg-pitch-700">
          <div
            className="h-full rounded-full bg-scoreboard-amber shadow-glow transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
