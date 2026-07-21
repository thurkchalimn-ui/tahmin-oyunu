import { useState } from 'react';
import type { PredictionHistoryItem } from '@/hooks/usePredictionHistory';
import { formatMatchTime } from '@/utils/dateUtils';
import { TeamLogo } from '@/components/common/TeamLogo';
import { Button } from '@/components/common/Button';
import type { PredictionChoice } from '@/types';

interface PredictionHistoryListProps {
  items: PredictionHistoryItem[];
}

const CHOICE_LABELS: Record<PredictionChoice, string> = { HOME: '1', DRAW: 'X', AWAY: '2' };
const PAGE_SIZE = 15;

/**
 * Bir oyuncunun geçmiş tahminlerini, maç bilgisi ve doğru/yanlış durumuyla listeler.
 * Liste 15'erlik sayfalara bölünür (uzun geçmişlerde tek seferde onlarca satır
 * yüklenmesin diye); `items` zaten kronolojik sırayla (en eski maç en üstte) gelir.
 */
export function PredictionHistoryList({ items }: PredictionHistoryListProps) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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
      {pageItems.map(({ match, prediction }) => {
        const isPending = prediction.isCorrect === null;
        const isCorrect = prediction.isCorrect === true;

        return (
          <div
            key={prediction.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-pitch-700/15
              bg-white p-3 dark:border-pitch-700 dark:bg-pitch-800"
          >
            <div>
              <p className="flex items-center gap-1.5 font-body text-sm font-medium text-pitch-900 dark:text-pitch-100">
                <TeamLogo name={match.homeTeam} logoUrl={match.homeTeamLogo} size="sm" />
                {match.homeTeam} vs {match.awayTeam}
                <TeamLogo name={match.awayTeam} logoUrl={match.awayTeamLogo} size="sm" />
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

      {totalPages > 1 && (
        <div className="mt-2 flex items-center justify-center gap-3">
          <Button
            variant="ghost"
            disabled={currentPage === 1}
            onClick={() => setPage((p) => p - 1)}
            className="!px-3 !py-1.5 text-xs"
          >
            ← Önceki
          </Button>
          <span className="font-mono text-xs text-pitch-700/60 dark:text-pitch-100/50">
            Sayfa {currentPage} / {totalPages}
          </span>
          <Button
            variant="ghost"
            disabled={currentPage === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="!px-3 !py-1.5 text-xs"
          >
            Sonraki →
          </Button>
        </div>
      )}
    </div>
  );
}
