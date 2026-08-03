import type { Match } from '@/types';
import { TeamLogo } from '@/components/common/TeamLogo';

interface RecentResultsPreviewProps {
  matches: Match[];
}

const RESULT_LABELS: Record<'HOME' | 'DRAW' | 'AWAY', string> = {
  HOME: '1',
  DRAW: 'X',
  AWAY: '2',
};

/**
 * Ana sayfadaki "Son Maç Sonuçları" önizlemesi. Skor bilgisi sadece canlı
 * skor verisi (liveScore) varsa gösterilir - her maç için garanti bir skor
 * kaydımız olmadığından (sadece 1/X/2 sonucu tutuluyor), skor yoksa onun
 * yerine kazanan sonucu (1/X/2) gösteririz.
 */
export function RecentResultsPreview({ matches }: RecentResultsPreviewProps) {
  if (matches.length === 0) return null;

  return (
    <section className="rounded-xl border border-pitch-700/15 bg-gradient-to-b from-white to-pitch-100 p-4 shadow-stadium dark:border-pitch-700 dark:from-pitch-800 dark:to-pitch-900">
      <h2 className="mb-3 font-display text-sm font-semibold text-pitch-900 dark:text-pitch-100">
        📋 Son Maç Sonuçları
      </h2>
      <div className="flex flex-col divide-y divide-pitch-700/10 dark:divide-pitch-100/10">
        {matches.map((match) => (
          <div key={match.id} className="flex items-center justify-between gap-2 py-2.5">
            <div className="flex flex-1 items-center gap-2 overflow-hidden">
              <TeamLogo name={match.homeTeam} logoUrl={match.homeTeamLogo} />
              <span className="truncate font-body text-xs text-pitch-900 dark:text-pitch-100">
                {match.homeTeam}
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {match.liveScore ? (
                <span className="font-mono text-sm font-bold text-pitch-900 dark:text-pitch-100">
                  {match.liveScore.homeGoals} - {match.liveScore.awayGoals}
                </span>
              ) : (
                <span className="rounded bg-scoreboard-amber/15 px-2 py-0.5 font-mono text-xs font-bold text-scoreboard-amberDark dark:text-scoreboard-amber">
                  {match.result ? RESULT_LABELS[match.result] : '-'}
                </span>
              )}
            </div>

            <div className="flex flex-1 items-center justify-end gap-2 overflow-hidden">
              <span className="truncate text-right font-body text-xs text-pitch-900 dark:text-pitch-100">
                {match.awayTeam}
              </span>
              <TeamLogo name={match.awayTeam} logoUrl={match.awayTeamLogo} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
