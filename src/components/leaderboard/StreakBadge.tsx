import { STREAK_TARGET } from '@/utils/streakUtils';

interface StreakBadgeProps {
  currentStreak: number;
  size?: 'sm' | 'lg';
}

/**
 * İmza tasarım elementi: 15 segmentli, stadyum skorbordu ışıklarını andıran
 * bir ilerleme göstergesi. Her segment bir doğru tahmine karşılık gelir;
 * dolu segmentler amber renkte parlar, 15. segmente ulaşınca glow efekti belirginleşir.
 */
export function StreakBadge({ currentStreak, size = 'lg' }: StreakBadgeProps) {
  const segments = Array.from({ length: STREAK_TARGET }, (_, i) => i < currentStreak);
  const isComplete = currentStreak >= STREAK_TARGET;
  const segmentSize = size === 'lg' ? 'h-3 w-2.5' : 'h-2 w-1.5';

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-2xl font-bold text-pitch-900 dark:text-pitch-100">
          {currentStreak}
        </span>
        <span className="font-mono text-xs text-pitch-700/60 dark:text-pitch-100/50">
          / {STREAK_TARGET} seri
        </span>
        {isComplete && <span className="ml-1 animate-pulse">🏆</span>}
      </div>
      <div className="flex gap-1" role="img" aria-label={`${currentStreak} / ${STREAK_TARGET} seri`}>
        {segments.map((filled, i) => (
          <span
            key={i}
            className={`${segmentSize} rounded-sm transition-all duration-300 ${
              filled
                ? 'bg-scoreboard-amber shadow-glow'
                : 'bg-pitch-700/20 dark:bg-pitch-700'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
