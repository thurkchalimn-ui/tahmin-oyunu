import type { PredictionHistoryItem } from '@/hooks/usePredictionHistory';
import { formatMatchTime } from '@/utils/dateUtils';
import type { PredictionChoice } from '@/types';

interface PredictionHistoryListProps {
  items: PredictionHistoryItem[];
}

const CHOICE_LABELS: Record<PredictionChoice, string> = { HOME: '1', DRAW: 'X', AWAY: '2' };

/** Bir oyuncunun geçmiş tahminlerini, maç bilgisi ve doğru/yanlış durumuyla listeler. */
export function PredictionHistoryList({ items }: PredictionHistoryListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-pitch-700/20 p-8 text-center dark:border-pitch-700">
        <p className="font-body text-sm text-pitch-700/60 dark:text-pitch-100/50">
          Henüz hiç tahmin yapılmamış.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map(({ match, prediction }) => {
        const isPending = prediction.isCorrect === null;
        const isCorrect = prediction.isCorrect === true;

        return (
          <div
            key={prediction.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-pitch-700/15
              bg-white p-3 dark:border-pitch-700 dark:bg-pitch-800"
          >
            <div>
              <p className="font-body text-sm font-medium text-pitch-900 dark:text-pitch-100">
                {match.homeTeam} vs {match.awayTeam}
              </p>
              <p className="font-mono text-xs text-pitch-700/50 dark:text-pitch-100/40">
                {formatMatchTime(match.kickoffAt)}
              </p>
            </div>
            <span
              className={`rounded-md px-3 py-1.5 font-mono text-xs font-bold ${
                isPending
                  ? 'bg-pitch-100 text-pitch-700 dark:bg-pitch-700 dark:text-pitch-100'
                  : isCorrect
                    ? 'bg-pick-correct text-white'
                    : 'bg-pick-wrong text-white'
              }`}
            >
              {CHOICE_LABELS[prediction.choice]}
              {!isPending && (isCorrect ? ' ✓' : ' ✗')}
            </span>
          </div>
        );
      })}
    </div>
  );
}
