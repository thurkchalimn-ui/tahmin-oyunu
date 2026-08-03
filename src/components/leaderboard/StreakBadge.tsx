import { Flame } from 'lucide-react';

interface StreakBadgeProps {
  currentStreak: number;
  size?: 'sm' | 'lg';
}

/**
 * Güncel doğru tahmin serisini gösterir. ÖNEMLİ: Artık sabit bir "/15" hedefi
 * YOK - seri, doğru tahmin devam ettikçe sınırsız şekilde büyür. 15'lik bir
 * rozet eşiği hâlâ arka planda var (bkz. userService.ts) ama bu görsel
 * bileşen artık ona kilitli değil - "20 / 15" gibi mantıksız bir görüntü
 * oluşmasını önler.
 */
export function StreakBadge({ currentStreak, size = 'lg' }: StreakBadgeProps) {
  const numberSize = size === 'lg' ? 'text-4xl' : 'text-2xl';
  const iconSize = size === 'lg' ? 22 : 16;

  return (
    <div className="flex items-center gap-2">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-scoreboard-amber/50 bg-pitch-950 text-scoreboard-amber shadow-glow">
        <Flame size={iconSize} />
      </span>
      <div className="flex items-baseline gap-1.5">
        <span className={`font-mono ${numberSize} font-bold text-pitch-900 dark:text-pitch-100`}>
          {currentStreak}
        </span>
        <span className="font-mono text-xs text-pitch-700/60 dark:text-pitch-100/50">
          maçlık seri
        </span>
      </div>
    </div>
  );
}
