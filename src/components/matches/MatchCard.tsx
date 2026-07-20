import type { Match, Prediction, PredictionChoice } from '@/types';
import { formatMatchTime, isMatchLocked } from '@/utils/dateUtils';

interface MatchCardProps {
  match: Match;
  prediction?: Prediction;
  onPredict: (choice: PredictionChoice) => void;
  isSubmitting?: boolean;
}

const CHOICE_LABELS: Record<PredictionChoice, string> = {
  HOME: '1',
  DRAW: 'X',
  AWAY: '2',
};

/** Tek bir maçı, tahmin seçeneklerini ve (varsa) sonucu gösteren kart. */
export function MatchCard({ match, prediction, onPredict, isSubmitting = false }: MatchCardProps) {
  const locked = isMatchLocked(match.kickoffAt);
  const hasResult = match.result !== null;

  return (
    <div
      className="rounded-xl border border-pitch-700/15 bg-white p-4 shadow-sm
        dark:border-pitch-700 dark:bg-pitch-800"
    >
      <div className="mb-3 flex items-center justify-between text-xs font-mono text-pitch-700/60 dark:text-pitch-100/50">
        <span>{match.league || 'Maç'} · #{match.dayOrder}</span>
        <span>{formatMatchTime(match.kickoffAt)}</span>
      </div>

      <div className="mb-4 flex items-center justify-between font-display text-base font-medium text-pitch-900 dark:text-pitch-100">
        <span className="flex-1 text-right">{match.homeTeam}</span>
        <span className="mx-3 text-pitch-700/40 dark:text-pitch-100/30">vs</span>
        <span className="flex-1">{match.awayTeam}</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(CHOICE_LABELS) as PredictionChoice[]).map((choice) => {
          const isSelected = prediction?.choice === choice;
          const isResultChoice = hasResult && match.result === choice;
          const isWrongPick = hasResult && isSelected && match.result !== choice;

          return (
            <button
              key={choice}
              disabled={locked || isSubmitting}
              onClick={() => onPredict(choice)}
              className={`rounded-lg py-2 font-mono text-sm font-bold transition-all
                disabled:cursor-not-allowed
                ${
                  isResultChoice
                    ? 'bg-pick-correct text-white'
                    : isWrongPick
                      ? 'bg-pick-wrong text-white'
                      : isSelected
                        ? 'bg-scoreboard-amber text-pitch-950'
                        : 'bg-pitch-100 text-pitch-900 hover:bg-scoreboard-amber/20 dark:bg-pitch-700 dark:text-pitch-100'
                } ${locked && !isSelected ? 'opacity-40' : ''}`}
            >
              {CHOICE_LABELS[choice]}
            </button>
          );
        })}
      </div>

      {locked && !hasResult && (
        <p className="mt-2 text-center font-mono text-xs text-pitch-700/50 dark:text-pitch-100/40">
          Maç başladı · tahmin kapandı
        </p>
      )}
    </div>
  );
}
