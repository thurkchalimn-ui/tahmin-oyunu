import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMatches } from '@/hooks/useMatches';
import { usePredictions } from '@/hooks/usePredictions';
import { submitPrediction } from '@/services/predictionService';
import { MatchList } from '@/components/matches/MatchList';
import { StreakBadge } from '@/components/leaderboard/StreakBadge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { AdBanner } from '@/components/common/AdBanner';
import { todayKey } from '@/utils/dateUtils';
import type { Match, PredictionChoice } from '@/types';

/** Ana sayfa: bugünün 20 maçını gösterir ve kullanıcının tahmin yapmasını sağlar. */
export function HomePage() {
  const { firebaseUser, profile } = useAuth();
  const date = todayKey();
  const { data: matches, loading: matchesLoading, error: matchesError } = useMatches(date);
  const { data: predictions, loading: predictionsLoading } = usePredictions(firebaseUser?.uid);
  const [submittingMatchId, setSubmittingMatchId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handlePredict(match: Match, choice: PredictionChoice) {
    if (!firebaseUser) {
      setSubmitError('Tahmin yapmak için giriş yapmalısınız.');
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

  if (matchesLoading || predictionsLoading) return <LoadingSpinner fullScreen label="Maçlar yükleniyor..." />;
  if (matchesError) return <ErrorMessage message={matchesError} />;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6">
      <section className="rounded-xl bg-pitch-900 p-5 text-pitch-100 dark:bg-pitch-800">
        <p className="mb-2 font-mono text-xs uppercase tracking-wide text-pitch-100/50">Güncel Serin</p>
        <StreakBadge currentStreak={profile?.currentStreak ?? 0} />
      </section>

      {submitError && <ErrorMessage message={submitError} />}

      <section>
        <h1 className="mb-3 font-display text-xl font-semibold text-pitch-900 dark:text-pitch-100">
          Bugünün 20 Maçı
        </h1>
        <MatchList
          matches={matches ?? []}
          predictions={predictions ?? []}
          onPredict={handlePredict}
          submittingMatchId={submittingMatchId}
        />
      </section>

      <AdBanner slot="bottom" />
    </div>
  );
}
