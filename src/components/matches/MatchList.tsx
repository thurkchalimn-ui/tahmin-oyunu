import type { Match, Prediction, PredictionChoice } from '@/types';
import { MatchCard } from '@/components/matches/MatchCard';

interface MatchListProps {
  matches: Match[];
  predictions: Prediction[];
  onPredict: (match: Match, choice: PredictionChoice) => void;
  submittingMatchId?: string | null;
}

/** Günün maçlarını, kullanıcının o maça verdiği tahminle eşleştirerek listeler. */
export function MatchList({ matches, predictions, onPredict, submittingMatchId }: MatchListProps) {
  if (matches.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-pitch-700/20 p-8 text-center dark:border-pitch-700">
        <p className="font-body text-sm text-pitch-700/60 dark:text-pitch-100/50">
          Bugün için henüz maç eklenmedi. Daha sonra tekrar kontrol edin.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {matches.map((match) => (
        <MatchCard
          key={match.id}
          match={match}
          prediction={predictions.find((p) => p.matchId === match.id)}
          onPredict={(choice) => onPredict(match, choice)}
          isSubmitting={submittingMatchId === match.id}
        />
      ))}
    </div>
  );
}
