import { ClipboardList } from 'lucide-react';
import type { Match, PredictionChoice } from '@/types';
import { TeamLogo } from '@/components/common/TeamLogo';
import { IconBadge } from '@/components/common/IconBadge';

interface RecentResultsPreviewProps {
  matches: Match[];
}

const RESULT_LABELS: Record<PredictionChoice, string> = {
  HOME: '1',
  DRAW: 'X',
  AWAY: '2',
};

/**
 * Ana sayfadaki "Son Maç Sonuçları" önizlemesi. ÖNEMLİ: skor/sonuç bilgisi
 * artık iki takımın ARASINDA değil, satırın EN SAĞINDA, ayrı bir rozet
 * olarak gösteriliyor - böylece "1" ya da "2" gibi bir sonuç kodu, yanlışlıkla
 * gerçek bir skormuş gibi (ör. "1 - 2") algılanmaz; ayrı ve net bir işaret olur.
 */
export function RecentResultsPreview({ matches }: RecentResultsPreviewProps) {
  if (matches.length === 0) return null;

  return (
    <section className="rounded-xl border border-pitch-700/15 bg-gradient-to-b from-white to-pitch-100 p-4 shadow-stadium dark:border-pitch-700 dark:from-pitch-800 dark:to-pitch-900">
      <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-pitch-900 dark:text-pitch-100">
        <IconBadge icon={<ClipboardList size={16} />} size="sm" />
        Son Maç Sonuçları
      </h2>
      <div className="flex flex-col divide-y divide-pitch-700/10 dark:divide-pitch-100/10">
        {matches.map((match) => (
          <div key={match.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="flex flex-1 items-center gap-1.5 overflow-hidden">
              <TeamLogo name={match.homeTeam} logoUrl={match.homeTeamLogo} />
              <span className="truncate font-body text-xs text-pitch-900 dark:text-pitch-100">
                {match.homeTeam}
              </span>
              <span className="shrink-0 px-1 font-mono text-[10px] text-pitch-700/40 dark:text-pitch-100/30">
                -
              </span>
              <TeamLogo name={match.awayTeam} logoUrl={match.awayTeamLogo} />
              <span className="truncate font-body text-xs text-pitch-900 dark:text-pitch-100">
                {match.awayTeam}
              </span>
            </div>

            <div className="shrink-0">
              {match.liveScore ? (
                <span className="rounded bg-pitch-100 px-2 py-1 font-mono text-xs font-bold text-pitch-900 dark:bg-pitch-700 dark:text-pitch-100">
                  {match.liveScore.homeGoals}-{match.liveScore.awayGoals}
                </span>
              ) : (
                <span className="rounded bg-scoreboard-amber/15 px-2 py-1 font-mono text-xs font-bold text-scoreboard-amberDark dark:text-scoreboard-amber">
                  {match.result ? RESULT_LABELS[match.result] : '-'}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
