import type { DailyLimitState } from '@/hooks/useDailyPredictionLimit';
import { Button } from '@/components/common/Button';

interface DailyLimitPanelProps {
  limit: DailyLimitState;
}

/** Kullanıcının günlük tahmin hakkını ve "Reklam İzle" ile hak kazanma seçeneğini gösterir. */
export function DailyLimitPanel({ limit }: DailyLimitPanelProps) {
  const { used, allowed, remaining, canEarnMore, isEarning, watchAdForCredit } = limit;
  const isOut = remaining === 0;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-pitch-700/15 bg-white p-4 dark:border-pitch-700 dark:bg-pitch-800">
      <div>
        <p className="font-mono text-xs uppercase tracking-wide text-pitch-700/60 dark:text-pitch-100/50">
          Bugünkü Tahmin Hakkın
        </p>
        <p className="font-display text-lg font-semibold text-pitch-900 dark:text-pitch-100">
          <span className={isOut ? 'text-pick-wrong' : 'text-scoreboard-amber'}>{remaining}</span>
          <span className="text-sm font-normal text-pitch-700/50 dark:text-pitch-100/40">
            {' '}
            / {allowed} kaldı ({used} kullanıldı)
          </span>
        </p>
      </div>

      {canEarnMore ? (
        <Button onClick={watchAdForCredit} isLoading={isEarning} variant="secondary" className="text-xs">
          🎬 Reklam İzle (+1 Hak)
        </Button>
      ) : (
        <span className="font-mono text-xs text-pitch-700/50 dark:text-pitch-100/40">
          Bugün için maksimum hakka ulaştın (20/20)
        </span>
      )}
    </div>
  );
}
