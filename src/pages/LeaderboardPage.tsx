import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { usePeriodLeaderboard } from '@/hooks/usePeriodLeaderboard';
import { markLeaderboardSeen } from '@/services/readStatusService';
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';
import { PeriodTabs } from '@/components/leaderboard/PeriodTabs';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import type { StatsPeriod } from '@/utils/periodUtils';

/** Liderlik tablosu sayfası: haftalık, aylık ve tüm-zamanlar sekmeleri arasında geçiş yapılabilir. */
export function LeaderboardPage() {
  const { firebaseUser } = useAuth();
  const [tab, setTab] = useState<StatsPeriod>('all');

  const allTime = useLeaderboard();
  const week = usePeriodLeaderboard('week');
  const month = usePeriodLeaderboard('month');

  const active = tab === 'all' ? allTime : tab === 'week' ? week : month;

  // Sayfa açılıp "Genel" listesi yüklenince, kullanıcının o anki sırasını
  // "görüldü" olarak kaydet - BottomNav'daki kırmızı nokta kaybolur. Bu
  // bildirim sadece tüm-zamanlar sıralamasına göre çalışır.
  useEffect(() => {
    if (!firebaseUser || !allTime.data) return;
    const rank = allTime.data.findIndex((u) => u.uid === firebaseUser.uid) + 1;
    if (rank > 0) markLeaderboardSeen(firebaseUser.uid, rank).catch(() => {});
  }, [firebaseUser, allTime.data]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-4 font-display text-xl font-semibold text-pitch-900 dark:text-pitch-100">
        Liderlik Tablosu
      </h1>

      <div className="mb-4">
        <PeriodTabs value={tab} onChange={setTab} />
      </div>

      {active.loading ? (
        <LoadingSpinner label="Liderlik tablosu yükleniyor..." />
      ) : active.error ? (
        <ErrorMessage message={active.error} />
      ) : (
        <LeaderboardTable
          users={active.data ?? []}
          currentUserId={firebaseUser?.uid}
          mode={tab === 'all' ? 'all' : 'period'}
        />
      )}
    </div>
  );
}
