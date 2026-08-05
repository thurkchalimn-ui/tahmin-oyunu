import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { usePeriodLeaderboard } from '@/hooks/usePeriodLeaderboard';
import { useUserRank } from '@/hooks/useUserRank';
import { markLeaderboardSeen } from '@/services/readStatusService';
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';
import { LeaderboardPodium } from '@/components/leaderboard/LeaderboardPodium';
import { PeriodTabs } from '@/components/leaderboard/PeriodTabs';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import type { StatsPeriod } from '@/utils/periodUtils';

/**
 * Liderlik tablosu sayfası: haftalık, aylık ve tüm-zamanlar sekmeleri
 * arasında geçiş yapılabilir. "Genel" (tüm-zamanlar) sekmesinde sıralama
 * XP'ye göredir; podyum ve kendi sıranın en altta sabit gösterilmesi de bu
 * sekmede tam olarak çalışır (dönemsel önbellekte gerçek XP tutulmuyor).
 */
export function LeaderboardPage() {
  const { firebaseUser, profile } = useAuth();
  const [tab, setTab] = useState<StatsPeriod>('all');

  const allTime = useLeaderboard();
  const week = usePeriodLeaderboard('week');
  const month = usePeriodLeaderboard('month');
  const rank = useUserRank(profile?.correctPredictions);

  const active = tab === 'all' ? allTime : tab === 'week' ? week : month;

  const topThree = useMemo(() => (active.data ?? []).slice(0, 3), [active.data]);
  const restOfList = useMemo(() => (active.data ?? []).slice(3), [active.data]);

  const ownRow = useMemo(() => {
    if (tab !== 'all' || !profile || !rank) return null;
    return { rank, user: profile };
  }, [tab, profile, rank]);

  // Sayfa açılıp "Genel" listesi yüklenince, kullanıcının o anki sırasını
  // "görüldü" olarak kaydet - BottomNav'daki kırmızı nokta kaybolur. Bu
  // bildirim sadece tüm-zamanlar sıralamasına göre çalışır.
  useEffect(() => {
    if (!firebaseUser || !allTime.data) return;
    const seenRank = allTime.data.findIndex((u) => u.uid === firebaseUser.uid) + 1;
    if (seenRank > 0) markLeaderboardSeen(firebaseUser.uid, seenRank).catch(() => {});
  }, [firebaseUser, allTime.data]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-1 flex items-center justify-between">
        {firebaseUser && (
          <Link
            to="/ligler"
            className="rounded-md bg-scoreboard-amber/15 px-3 py-1.5 font-mono text-xs font-semibold text-scoreboard-amberDark hover:bg-scoreboard-amber/25 dark:text-scoreboard-amber"
          >
            👥 Liglerim
          </Link>
        )}
      </div>

      <div className="mb-4 text-center">
        <h1 className="flex items-center justify-center gap-2 font-display text-2xl font-bold text-pitch-900 dark:text-pitch-100">
          <Crown className="text-scoreboard-amber" size={22} />
          Liderlik
        </h1>
        <p className="font-body text-sm text-pitch-700/60 dark:text-pitch-100/50">
          En iyi tahmincilerle yarış, zirveye yerleş!
        </p>
      </div>

      <div className="mb-4">
        <PeriodTabs value={tab} onChange={setTab} />
      </div>

      {active.loading ? (
        <LoadingSpinner label="Liderlik tablosu yükleniyor..." />
      ) : active.error ? (
        <ErrorMessage message={active.error} />
      ) : (
        <div className="flex flex-col gap-4">
          <LeaderboardPodium topThree={topThree} />
          <LeaderboardTable
            users={restOfList}
            currentUserId={firebaseUser?.uid}
            mode={tab === 'all' ? 'all' : 'period'}
            ownRow={ownRow}
            rankOffset={3}
          />
        </div>
      )}
    </div>
  );
}
