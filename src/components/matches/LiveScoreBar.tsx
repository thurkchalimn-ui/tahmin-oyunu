import type { LiveScore } from '@/types';
import { getLiveScoreLabel } from '@/utils/liveScoreUtils';

interface LiveScoreBarProps {
  liveScore: LiveScore;
}

/** Maç devam ederken kart içinde gösterilen anlık skor çubuğu. */
export function LiveScoreBar({ liveScore }: LiveScoreBarProps) {
  const { label, isLive } = getLiveScoreLabel(liveScore);

  return (
    <div
      className="mb-4 -mt-2 flex items-center justify-center gap-2 rounded-lg bg-pitch-700/5 py-2
        font-mono text-sm dark:bg-pitch-700/40"
    >
      {isLive && <span className="h-2 w-2 animate-pulse rounded-full bg-pick-wrong" />}
      <span className="font-bold text-pitch-900 dark:text-pitch-100">
        {liveScore.homeGoals} - {liveScore.awayGoals}
      </span>
      <span className="text-xs text-pitch-700/60 dark:text-pitch-100/50">{label}</span>
    </div>
  );
}
