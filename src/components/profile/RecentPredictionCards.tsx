import { Link } from 'react-router-dom';
import { History, CheckCircle2, XCircle } from 'lucide-react';
import { IconBadge } from '@/components/common/IconBadge';
import { TeamLogo } from '@/components/common/TeamLogo';
import type { Match, Prediction, PredictionChoice } from '@/types';

interface RecentPredictionCardsProps {
  items: { match: Match; prediction: Prediction }[];
}

const CHOICE_LABELS: Record<PredictionChoice, string> = {
  HOME: '1',
  DRAW: 'X',
  AWAY: '2',
};

function formatCardDate(dateKey: string): string {
  const date = new Date(dateKey);
  if (Number.isNaN(date.getTime())) return dateKey;
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Profil sayfasındaki "Son Tahminlerin" kart şeridi - mockup'takiyle aynı
 * kart formatı, ama gerçek verilerimizle: kesin skor yerine bizim 1/X/2
 * tahmin formatımız, XP yerine sadece doğru/yanlış göstergesi.
 */
export function RecentPredictionCards({ items }: RecentPredictionCardsProps) {
  const resolved = items.filter((i) => i.prediction.isCorrect !== null).slice(0, 5);
  if (resolved.length === 0) return null;

  return (
    <section className="rounded-xl border border-pitch-700/15 bg-gradient-to-b from-white to-pitch-100 p-4 shadow-stadium dark:border-pitch-700 dark:from-pitch-800 dark:to-pitch-900">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-pitch-900 dark:text-pitch-100">
          <IconBadge icon={<History size={16} />} size="sm" />
          Son Tahminlerin
        </h2>
        <Link to="/tahminlerim" className="font-mono text-xs text-scoreboard-amber hover:underline">
          Tümü →
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        {resolved.map(({ match, prediction }) => {
          const isCorrect = prediction.isCorrect === true;
          return (
            <div
              key={match.id}
              className="flex w-40 shrink-0 flex-col gap-2 rounded-lg border border-pitch-700/15 bg-white p-3 dark:border-pitch-700 dark:bg-pitch-800"
            >
              <p className="font-mono text-[10px] text-pitch-700/50 dark:text-pitch-100/40">
                {formatCardDate(match.date)}
              </p>

              <div className="flex items-center justify-between gap-1">
                <TeamLogo name={match.homeTeam} logoUrl={match.homeTeamLogo} />
                <span className="font-mono text-xs text-pitch-700/40 dark:text-pitch-100/30">vs</span>
                <TeamLogo name={match.awayTeam} logoUrl={match.awayTeamLogo} />
              </div>
              <p className="truncate font-body text-[11px] text-pitch-900 dark:text-pitch-100">
                {match.homeTeam} - {match.awayTeam}
              </p>

              <p className="font-mono text-[10px] text-pitch-700/60 dark:text-pitch-100/50">
                Tahminin: <span className="font-bold">{CHOICE_LABELS[prediction.choice]}</span>
              </p>

              <div className="flex items-center gap-1">
                {isCorrect ? (
                  <CheckCircle2 size={14} className="text-pick-correct" />
                ) : (
                  <XCircle size={14} className="text-pick-wrong" />
                )}
                <span
                  className={`font-mono text-[11px] font-semibold ${
                    isCorrect ? 'text-pick-correct' : 'text-pick-wrong'
                  }`}
                >
                  {isCorrect ? 'Doğru Tahmin' : 'Yanlış Tahmin'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
