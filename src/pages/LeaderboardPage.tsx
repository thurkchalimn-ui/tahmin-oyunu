import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { markLeaderboardSeen } from '@/services/readStatusService';
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';

/** Liderlik tablosu sayfası: en yüksek seriye sahip oyuncuları listeler. */
export function LeaderboardPage() {
  const { firebaseUser } = useAuth();
  const { data: users, loading, error } = useLeaderboard();

  // Sayfa açılıp liste yüklenince, kullanıcının o anki sırasını "görüldü" olarak
  // kaydet - BottomNav'daki kırmızı nokta (sıra değişikliği bildirimi) kaybolur.
  useEffect(() => {
    if (!firebaseUser || !users) return;
    const rank = users.findIndex((u) => u.uid === firebaseUser.uid) + 1;
    if (rank > 0) markLeaderboardSeen(firebaseUser.uid, rank).catch(() => {});
  }, [firebaseUser, users]);

  if (loading) return <LoadingSpinner fullScreen label="Liderlik tablosu yükleniyor..." />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-4 font-display text-xl font-semibold text-pitch-900 dark:text-pitch-100">
        Liderlik Tablosu
      </h1>
      <LeaderboardTable users={users ?? []} currentUserId={firebaseUser?.uid} />
    </div>
  );
}
