import { useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMatches } from '@/hooks/useMatches';
import { usePredictions } from '@/hooks/usePredictions';
import { useDailyPredictionLimit } from '@/hooks/useDailyPredictionLimit';
import { useWeeklyTopThree } from '@/hooks/useWeeklyTopThree';
import { useRecentResults } from '@/hooks/useRecentResults';
import { useUserRank } from '@/hooks/useUserRank';
import { submitPrediction } from '@/services/predictionService';
import { MatchList } from '@/components/matches/MatchList';
import { DailyLimitPanel } from '@/components/matches/DailyLimitPanel';
import { DateNavigator } from '@/components/matches/DateNavigator';
import { StreakBadge } from '@/components/leaderboard/StreakBadge';
import { HomeMatchBanner } from '@/components/home/HomeMatchBanner';
import { HomeStatStrip } from '@/components/home/HomeStatStrip';
import { WeeklyPodium } from '@/components/home/WeeklyPodium';
import { RecentResultsPreview } from '@/components/home/RecentResultsPreview';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { AdBanner } from '@/components/common/AdBanner';
import { todayKey, formatDateHeading } from '@/utils/dateUtils';
import type { Match, PredictionChoice } from '@/types';

// ÖNEMLİ: Bu gradyan bilinçli olarak Tailwind config'deki özel bir class
// yerine DOĞRUDAN inline style olarak tanımlanıyor - derleme/eşleşme adımına
// bağlı olmadığı için garanti çalışır. Renk yine projenin kendi paletinden:
// scoreboard.amber (#F2B705).
const STADIUM_GLOW_STYLE = {
  backgroundImage:
    'radial-gradient(ellipse 70% 45% at 20% -15%, rgba(242, 183, 5, 0.18), transparent 60%), ' +
    'radial-gradient(ellipse 60% 40% at 85% -10%, rgba(242, 183, 5, 0.12), transparent 65%)',
};

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

  // Yeni ana sayfa bölümleri için veri (XP içermeyen, gerçek verilerle)
  const { data: weeklyTopThree, source: weeklySource } = useWeeklyTopThree();
  const { data: recentResults } = useRecentResults(4);
  const rank = useUserRank(profile?.correctPredictions);

  // Sonucu henüz belirlenmemiş maçlar üstte (en erken başlayacak olan en üstte),
  // sonuçlanmış maçlar listenin en altında ama kendi içinde: önce en son güne
  // ait maçlar, aynı gün içinde de dayOrder'a göre 20'den geriye doğru sıralanır
  // (bkz. usePredictionHistory.ts - profildeki sıralamayla birebir aynı mantık).
  const orderedMatches = useMemo(() => {
    const list = matches ?? [];
    const pending = [...list.filter((m) => m.result === null)].sort(
      (a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime(),
    );
    const resolved = [...list.filter((m) => m.result !== null)].sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return b.dayOrder - a.dayOrder;
    });
    return [...pending, ...resolved];
  }, [matches]);

  // "Bugünün Maçları X/Y" bannerı SADECE bugünü görüntülerken hesaplanır -
  // başka bir güne gidildiğinde (selectedDate !== today) gösterilmez, çünkü
  // o an elimizde sadece seçilen günün maç verisi var, bugünün değil.
  const todayBannerData = useMemo(() => {
    if (selectedDate !== today || !matches) return null;
    const predictedIds = new Set((predictions ?? []).map((p) => p.matchId));
    const predictedCount = matches.filter((m) => predictedIds.has(m.id)).length;
    return { predictedCount, totalCount: matches.length };
  }, [selectedDate, today, matches, predictions]);

  function scrollToMatches() {
    document.getElementById('mac-listesi')?.scrollIntoView({ behavior: 'smooth' });
  }

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
    // `relative` + `overflow-hidden`: içindeki ışık katmanı `absolute`
    // konumlandırılıyor, sayfa dışına taşmasın diye kırpılıyor. Katman
    // `pointer-events-none` olduğu için hiçbir tıklama/dokunmayı engellemez.
    // Kendi arka plan rengini burada yeniden tanımlamıyoruz - App.tsx'in kök
    // sarmalayıcısındaki bg-pitch-100/dark:bg-pitch-900 zaten geçerli.
    <div className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
        style={STADIUM_GLOW_STYLE}
      />

      <div className="relative mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6">
        {todayBannerData && (
          <HomeMatchBanner
            predictedCount={todayBannerData.predictedCount}
            totalCount={todayBannerData.totalCount}
            onCtaClick={scrollToMatches}
          />
        )}

        {profile && (
          <HomeStatStrip
            dailyStreak={profile.activityStreak ?? 0}
            correctPredictions={profile.correctPredictions}
            rank={rank}
          />
        )}

        <section className="rounded-xl border border-pitch-700/15 bg-white p-5 shadow-stadium dark:border-pitch-700 dark:bg-pitch-800">
          <p className="mb-2 font-mono text-xs uppercase tracking-wide text-pitch-700/60 dark:text-pitch-100/50">
            Güncel Serin
          </p>
          <StreakBadge currentStreak={profile?.currentStreak ?? 0} />
        </section>

        {firebaseUser && !dailyLimit.loading && <DailyLimitPanel limit={dailyLimit} />}

        {submitError && <ErrorMessage message={submitError} />}
        {dailyLimit.error && <ErrorMessage message={dailyLimit.error} />}

        {(weeklyTopThree.length > 0 || recentResults.length > 0) && (
          <div className="grid gap-4 sm:grid-cols-2">
            <WeeklyPodium topThree={weeklyTopThree} source={weeklySource} />
            <RecentResultsPreview matches={recentResults} />
          </div>
        )}

        <section id="mac-listesi">
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
    </div>
  );
}
