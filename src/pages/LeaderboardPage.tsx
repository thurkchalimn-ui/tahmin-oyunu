import { useAuth } from '@/hooks/useAuth';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';

/** Liderlik tablosu sayfası: en yüksek seriye sahip oyuncuları listeler. */
export function LeaderboardPage() {
  const { firebaseUser } = useAuth();
  const { data: users, loading, error } = useLeaderboard();

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
