import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePredictionHistory } from '@/hooks/usePredictionHistory';
import { PeriodTabs } from '@/components/leaderboard/PeriodTabs';
import { PredictionHistoryList } from '@/components/leaderboard/PredictionHistoryList';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { getPeriodRange, type StatsPeriod } from '@/utils/periodUtils';
import { usePageTitle } from '@/hooks/usePageTitle';

/**
 * Profildeki "Son Tahminlerin" kart şeridinin yanındaki "Tümü" linkinin
 * gittiği, kullanıcının TÜM tahmin geçmişini (dönem filtreli) gösteren sayfa.
 */
export function AllPredictionsPage() {
  usePageTitle('Tüm Tahminlerim');
  const { firebaseUser } = useAuth();
  const { data: history, loading, error } = usePredictionHistory(firebaseUser?.uid);
  const [tab, setTab] = useState<StatsPeriod>('all');

  const filteredHistory = useMemo(() => {
    if (!history) return null;
    const range = getPeriodRange(tab);
    if (!range) return history;
    return history.filter((item) => item.match.date >= range.start && item.match.date < range.end);
  }, [history, tab]);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-6">
      <Link
        to="/profil"
        className="inline-flex items-center gap-1 font-mono text-xs text-scoreboard-amber hover:underline"
      >
        <ArrowLeft size={14} />
        Profile dön
      </Link>

      <h1 className="font-display text-xl font-semibold text-pitch-900 dark:text-pitch-100">
        Tüm Tahminlerim
      </h1>

      <PeriodTabs value={tab} onChange={setTab} />

      {loading ? (
        <LoadingSpinner label="Tahminler yükleniyor..." />
      ) : error ? (
        <ErrorMessage message={error} />
      ) : (
        <PredictionHistoryList items={filteredHistory ?? []} />
      )}
    </div>
  );
}
