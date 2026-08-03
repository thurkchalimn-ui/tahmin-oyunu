import { Target } from 'lucide-react';

interface StreakBadgeProps {
  currentStreak: number;
  size?: 'sm' | 'lg';
}

// Görsel ilerleme çubuğu için basamaklar - sabit bir "/15" hedefi DEĞİL,
// seri büyüdükçe çubuk bir sonraki basamağa göre dinamik olarak dolar. Bu
// sayede seri 15'i (ya da 100'ü) geçse bile çubuk hep anlamlı bir ilerleme
// gösterir, "20 / 15" gibi mantıksız bir görüntü hiç oluşmaz.
const TIERS = [5, 10, 15, 25, 50, 100, 250];

/**
 * Güncel doğru tahmin serisini gösterir - ikon olarak 🎯 (Target) kullanır,
 * "Günlük Seri" (giriş serisi) istatistik kutusundaki 🔥 (Flame) ile
 * karışmasın diye bilinçli olarak farklı bir ikon seçildi.
 */
export function StreakBadge({ currentStreak, size = 'lg' }: StreakBadgeProps) {
  const nextTier = TIERS.find((t) => t > currentStreak);
  const prevTier = [...TIERS].reverse().find((t) => t <= currentStreak) ?? 0;
  const target = nextTier ?? currentStreak;
  const progress =
    nextTier && nextTier > prevTier
      ? Math.min(100, Math.round(((currentStreak - prevTier) / (nextTier - prevTier)) * 100))
      : 100;

  const numberSize = size === 'lg' ? 'text-3xl' : 'text-xl';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-scoreboard-amber/50 bg-pitch-950 text-scoreboard-amber shadow-glow">
          <Target size={size === 'lg' ? 18 : 14} />
        </span>
        <div className="flex items-baseline gap-1.5">
          <span className={`font-mono ${numberSize} font-bold text-pitch-900 dark:text-pitch-100`}>
            {currentStreak}
          </span>
          <span className="font-mono text-xs text-pitch-700/60 dark:text-pitch-100/50">
            / {target} seri
          </span>
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-pitch-700/10 dark:bg-pitch-700">
        <div
          className="h-full rounded-full bg-scoreboard-amber shadow-glow transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
