import { useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMatches } from '@/hooks/useMatches';
import { usePredictions } from '@/hooks/usePredictions';
import { useWeeklyTopThree } from '@/hooks/useWeeklyTopThree';
import { useRecentResults } from '@/hooks/useRecentResults';
import { useUserRank } from '@/hooks/useUserRank';
import { StreakBadge } from '@/components/leaderboard/StreakBadge';
import { HomeMatchBanner } from '@/components/home/HomeMatchBanner';
import { HomeStatStrip } from '@/components/home/HomeStatStrip';
import { WeeklyPodium } from '@/components/home/WeeklyPodium';
import { RecentResultsPreview } from '@/components/home/RecentResultsPreview';
import { AdBanner } from '@/components/common/AdBanner';
import { todayKey } from '@/utils/dateUtils';

// ÖNEMLİ: Bu gradyan bilinçli olarak Tailwind config'deki özel bir class
// yerine DOĞRUDAN inline style olarak tanımlanıyor - derleme/eşleşme adımına
// bağlı olmadığı için garanti çalışır. Renk yine projenin kendi paletinden:
// scoreboard.amber (#F2B705).
const STADIUM_GLOW_STYLE = {
  backgroundImage:
    'radial-gradient(ellipse 70% 45% at 20% -15%, rgba(242, 183, 5, 0.18), transparent 60%), ' +
    'radial-gradient(ellipse 60% 40% at 85% -10%, rgba(242, 183, 5, 0.12), transparent 65%)',
};

/**
 * Ana sayfa: ÖZET sayfası - bugünün maç bannerı, istatistik şeridi, güncel
 * seri, haftalık podyum ve son sonuçlar önizlemesi. Maçların listelendiği ve
 * tahmin yapıldığı yer artık burası DEĞİL - "Tahmin Yap" butonu ayrı bir
 * sayfaya (/maclar, bkz. MatchesPage.tsx) yönlendirir. Burada sadece
 * bugünün maç sayısı/tahmin edilen sayısını hesaplamak için hafif bir
 * maç+tahmin sorgusu yapılır, liste hiç render edilmez.
 */
export function HomePage() {
  const { firebaseUser, profile } = useAuth();
  const today = todayKey();
  const { data: matches } = useMatches(today);
  const { data: predictions } = usePredictions(firebaseUser?.uid);

  const { data: weeklyTopThree, source: weeklySource } = useWeeklyTopThree();
  const { data: recentResults } = useRecentResults(4);
  const rank = useUserRank(profile?.correctPredictions);

  const todayBannerData = useMemo(() => {
    if (!matches) return null;
    const predictedIds = new Set((predictions ?? []).map((p) => p.matchId));
    const predictedCount = matches.filter((m) => predictedIds.has(m.id)).length;
    return { predictedCount, totalCount: matches.length };
  }, [matches, predictions]);

  return (
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
          />
        )}

        {profile && (
          <HomeStatStrip
            dailyStreak={profile.activityStreak ?? 0}
            correctPredictions={profile.correctPredictions}
            rank={rank}
            xp={profile.xp}
          />
        )}

        <section className="rounded-xl border border-pitch-700/15 bg-white p-5 shadow-stadium dark:border-pitch-700 dark:bg-pitch-800">
          <p className="mb-2 font-mono text-xs uppercase tracking-wide text-pitch-700/60 dark:text-pitch-100/50">
            Güncel Serin
          </p>
          <StreakBadge currentStreak={profile?.currentStreak ?? 0} />
        </section>

        {(weeklyTopThree.length > 0 || recentResults.length > 0) && (
          <div className="flex flex-col gap-4">
            <WeeklyPodium topThree={weeklyTopThree} source={weeklySource} />
            <RecentResultsPreview matches={recentResults} predictions={predictions ?? []} />
          </div>
        )}

        <AdBanner slot="bottom" />
      </div>
    </div>
  );
}
