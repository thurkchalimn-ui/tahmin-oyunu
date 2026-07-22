import { useState } from 'react';
import type { Match, Prediction, PredictionChoice } from '@/types';
import { formatMatchTime, isMatchLocked } from '@/utils/dateUtils';
import { Button } from '@/components/common/Button';
import { TeamLogo } from '@/components/common/TeamLogo';
import { LiveScoreBar } from '@/components/matches/LiveScoreBar';

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

/**
 * Tek bir maçı, tahmin seçeneklerini ve (varsa) sonucu gösteren kart.
 * Akış: kullanıcı önce bir seçenek işaretler (henüz kaydedilmez), sonra
 * "Tahmini Onayla" butonuna basarak kesinleştirir. Onaydan sonra (ve maç
 * kilitlendiğinde) seçim değiştirilemez - bu hem burada hem de Firestore
 * güvenlik kuralında (predictions koleksiyonunda update sadece admin'e açık) uygulanır.
 */
export function MatchCard({ match, prediction, onPredict, isSubmitting = false }: MatchCardProps) {
  const locked = isMatchLocked(match.kickoffAt);
  const hasResult = match.result !== null;
  const alreadyPredicted = Boolean(prediction);

  // Kullanıcının henüz onaylamadığı, sadece ekranda işaretlediği seçim (kaydedilmemiş)
  const [pendingChoice, setPendingChoice] = useState<PredictionChoice | null>(null);

  function handleChoiceClick(choice: PredictionChoice) {
    if (locked || alreadyPredicted || isSubmitting) return;
    setPendingChoice(choice);
  }

  function handleConfirm() {
    if (!pendingChoice) return;
    onPredict(pendingChoice);
  }

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
        <span className="flex flex-1 items-center justify-end gap-2 text-right">
          {match.homeTeam}
          <TeamLogo name={match.homeTeam} logoUrl={match.homeTeamLogo} />
        </span>
        <span className="mx-3 text-pitch-700/40 dark:text-pitch-100/30">vs</span>
        <span className="flex flex-1 items-center gap-2">
          <TeamLogo name={match.awayTeam} logoUrl={match.awayTeamLogo} />
          {match.awayTeam}
        </span>
      </div>

      {/* Skor çubuğu artık sadece maç devam ederken değil, sonuçlandıktan sonra da
          gösteriliyor - check-results.js sonuçlandırırken skoru artık silmiyor. */}
      {match.liveScore && <LiveScoreBar liveScore={match.liveScore} />}

      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(CHOICE_LABELS) as PredictionChoice[]).map((choice) => {
          const isSavedChoice = prediction?.choice === choice;
          const isPendingChoice = !alreadyPredicted && pendingChoice === choice;
          const isResultChoice = hasResult && match.result === choice;
          const isWrongPick = hasResult && isSavedChoice && match.result !== choice;

          return (
            <button
              key={choice}
              disabled={locked || alreadyPredicted || isSubmitting}
              onClick={() => handleChoiceClick(choice)}
              className={`rounded-lg py-2 font-mono text-sm font-bold transition-all
                disabled:cursor-not-allowed
                ${
                  isResultChoice
                    ? 'bg-pick-correct text-white'
                    : isWrongPick
                      ? 'bg-pick-wrong text-white'
                      : isSavedChoice
                        ? 'bg-scoreboard-amber text-pitch-950'
                        : isPendingChoice
                          ? 'bg-scoreboard-amber/25 text-pitch-900 ring-2 ring-scoreboard-amber dark:text-pitch-100'
                          : 'bg-pitch-100 text-pitch-900 hover:bg-scoreboard-amber/20 dark:bg-pitch-700 dark:text-pitch-100'
                } ${locked && !isSavedChoice ? 'opacity-40' : ''}`}
            >
              {CHOICE_LABELS[choice]}
            </button>
          );
        })}
      </div>

      {!alreadyPredicted && !locked && (
        <Button
          onClick={handleConfirm}
          disabled={!pendingChoice}
          isLoading={isSubmitting}
          className="mt-3 w-full"
        >
          Tahmini Onayla
        </Button>
      )}

      {alreadyPredicted && !hasResult && (
        <p className="mt-2 text-center font-mono text-xs text-pitch-700/50 dark:text-pitch-100/40">
          Tahminin onaylandı · artık değiştirilemez
        </p>
      )}

      {locked && !hasResult && !alreadyPredicted && (
        <p className="mt-2 text-center font-mono text-xs text-pitch-700/50 dark:text-pitch-100/40">
          Maç başladı · tahmin kapandı
        </p>
      )}
    </div>
  );
}
