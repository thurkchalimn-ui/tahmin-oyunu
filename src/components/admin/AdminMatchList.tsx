import { useState } from 'react';
import type { Match, PredictionChoice } from '@/types';
import { formatMatchTime } from '@/utils/dateUtils';
import { TeamLogo } from '@/components/common/TeamLogo';

interface AdminMatchListProps {
  matches: Match[];
  onSetResult: (matchId: string, result: PredictionChoice) => Promise<void>;
}

const CHOICE_LABELS: Record<PredictionChoice, string> = { HOME: '1', DRAW: 'X', AWAY: '2' };

/** Admin için günün maçlarını listeler ve sonuç girme butonlarını sağlar. */
export function AdminMatchList({ matches, onSetResult }: AdminMatchListProps) {
  const [savingId, setSavingId] = useState<string | null>(null);

  async function handleResult(matchId: string, result: PredictionChoice) {
    setSavingId(matchId);
    try {
      await onSetResult(matchId, result);
    } finally {
      setSavingId(null);
    }
  }

  if (matches.length === 0) {
    return <p className="text-sm text-pitch-700/60 dark:text-pitch-100/50">Bu tarihte maç yok.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {matches.map((match) => (
        <div
          key={match.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border
            border-pitch-700/15 bg-white p-3 dark:border-pitch-700 dark:bg-pitch-800"
        >
          <div>
            <p className="flex items-center gap-1.5 font-body text-sm font-medium text-pitch-900 dark:text-pitch-100">
              <TeamLogo name={match.homeTeam} logoUrl={match.homeTeamLogo} size="sm" />
              #{match.dayOrder} {match.homeTeam} vs {match.awayTeam}
              <TeamLogo name={match.awayTeam} logoUrl={match.awayTeamLogo} size="sm" />
            </p>
            <p className="font-mono text-xs text-pitch-700/50 dark:text-pitch-100/40">
              {formatMatchTime(match.kickoffAt)}
            </p>
          </div>

          <div className="flex gap-1.5">
            {(Object.keys(CHOICE_LABELS) as PredictionChoice[]).map((choice) => (
              <button
                key={choice}
                disabled={savingId === match.id}
                onClick={() => handleResult(match.id, choice)}
                className={`rounded-md px-3 py-1.5 font-mono text-xs font-bold transition
                  disabled:opacity-50 ${
                    match.result === choice
                      ? 'bg-pick-correct text-white'
                      : 'bg-pitch-100 text-pitch-900 hover:bg-scoreboard-amber/30 dark:bg-pitch-700 dark:text-pitch-100'
                  }`}
              >
                {CHOICE_LABELS[choice]}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
