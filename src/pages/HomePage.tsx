import { useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMatches } from '@/hooks/useMatches';
import { usePredictions } from '@/hooks/usePredictions';
import { useDailyPredictionLimit } from '@/hooks/useDailyPredictionLimit';
import { submitPrediction } from '@/services/predictionService';
import { MatchList } from '@/components/matches/MatchList';
import { DailyLimitPanel } from '@/components/matches/DailyLimitPanel';
import { DateNavigator } from '@/components/matches/DateNavigator';
import { StreakBadge } from '@/components/leaderboard/StreakBadge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { AdBanner } from '@/components/common/AdBanner';
import { todayKey, formatDateHeading } from '@/utils/dateUtils';
import { orderMatchesForDisplay } from '@/utils/matchNumbering';
import type { Match, PredictionChoice } from '@/types';

/** Ana sayfa: seçilen günün maçlarını gösterir ve kullanıcının tahmin yapmasını sağlar. */
export function HomePage() {
  const { firebaseUser, profile, emailVerified } = useAuth();
  const today = todayKey();
  const [selectedDate, setSelectedDate] = useState(today);
  const { data: matches, loading: matchesLoading, error: matchesError } = useMatches(selectedDate);
  const { data: predictions, loading: predictionsLoading } = usePredictions(firebaseUser?.uid);
  // Günlük tahmin hakkı her zaman BUGÜNE göre hesaplanır - hangi günün maçlarına bakıldığından bağımsız.
  const dailyLimit = useDailyPredictionLimit(firebaseUser?.uid, today);
  const [submittingMatchId, setSubmittingMatchId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Sonucu henüz belirlenmemiş maçlar üstte (en erken başlayacak üstte),
  // sonuçlanmış maçlar altta (en son başlayan üstte); aynı saatte başlayan
  // maçlarda ev sahibi takım adına göre alfabetik sıralama uygulanır.
  // Bu mantık, seri hesaplamasıyla (userService.ts) birebir aynıdır.
  const orderedMatches = useMemo(() => orderMatchesForDisplay(matches ?? []), [matches]);

  async function handlePredict(match: Match, choice: PredictionChoice) {
    if (!firebaseUser) {
      setSubmitError('Tahmin yapmak için giriş yapmalısınız.');
      return;
    }
    if (!emailVerified) {
      setSubmitError('Tahmin yapabilmek için önce e-postanı doğrulaman gerekiyor.');
      return;
    }
    if (dailyLimit.remaining <= 0) {
      setSubmitError(
        'Bugünkü tahmin hakların bitti. Reklam izleyerek +1 hak kazanabilirsin (yukarıdaki panel).',
      );
      return;
    }
    setSubmitError(null);
    setSubmittingMatchId(match.id);
    try {
      await submitPrediction(firebaseUser.uid, match, choice);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Tahmin kaydedilemedi.');
    } finally {
      setSubmittingMatchId(null);
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6">
      <section className="rounded-xl border border-pitch-700/15 bg-white p-5 dark:border-pitch-700 dark:bg-pitch-800">
        <p className="mb-2 font-mono text-xs uppercase tracking-wide text-pitch-700/60 dark:text-pitch-100/50">
          Güncel Serin
        </p>
        <StreakBadge currentStreak={profile?.currentStreak ?? 0} />
      </section>

      {firebaseUser && !dailyLimit.loading && <DailyLimitPanel limit={dailyLimit} />}

      {submitError && <ErrorMessage message={submitError} />}
      {dailyLimit.error && <ErrorMessage message={dailyLimit.error} />}

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h1 className="font-display text-xl font-semibold text-pitch-900 dark:text-pitch-100">
            {selectedDate === today ? 'Bugünün Maçları' : `${formatDateHeading(selectedDate)} Maçları`}
          </h1>
          <DateNavigator date={selectedDate} onChange={setSelectedDate} />
        </div>

        {matchesLoading || predictionsLoading ? (
          <LoadingSpinner label="Maçlar yükleniyor..." />
        ) : matchesError ? (
          <ErrorMessage message={matchesError} />
        ) : (
          <MatchList
            matches={orderedMatches}
            predictions={predictions ?? []}
            onPredict={handlePredict}
            submittingMatchId={submittingMatchId}
          />
        )}
      </section>

      <AdBanner slot="bottom" />
    </div>
  );
}
