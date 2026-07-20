import { useParams, Link } from 'react-router-dom';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { usePredictionHistory } from '@/hooks/usePredictionHistory';
import { StreakBadge } from '@/components/leaderboard/StreakBadge';
import { PredictionHistoryList } from '@/components/leaderboard/PredictionHistoryList';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';

/** Liderlik tablosunda bir oyuncunun adına tıklandığında açılan, herkese açık salt-okunur profil. */
export function PlayerProfilePage() {
  const { uid } = useParams<{ uid: string }>();
  const { data: profile, loading: profileLoading, error: profileError } = usePlayerProfile(uid);
  const { data: history, loading: historyLoading, error: historyError } = usePredictionHistory(uid);

  if (profileLoading) return <LoadingSpinner fullScreen label="Oyuncu yükleniyor..." />;
  if (profileError || !profile) return <ErrorMessage message={profileError ?? 'Oyuncu bulunamadı.'} />;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-6">
      <Link to="/liderlik" className="font-mono text-xs text-scoreboard-amber">
        ← Liderlik tablosuna dön
      </Link>

      <h1 className="font-display text-xl font-semibold text-pitch-900 dark:text-pitch-100">
        {profile.displayName}
      </h1>

      <section className="rounded-xl border border-pitch-700/15 bg-white p-5 dark:border-pitch-700 dark:bg-pitch-800">
        <p className="mb-2 font-mono text-xs uppercase tracking-wide text-pitch-700/60 dark:text-pitch-100/50">
          Güncel Seri
        </p>
        <StreakBadge currentStreak={profile.currentStreak} />
        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-pitch-700/10 pt-4 text-center dark:border-pitch-100/10">
          <div>
            <p className="font-mono text-lg font-bold text-scoreboard-amber">{profile.bestStreak}</p>
            <p className="font-mono text-[10px] uppercase text-pitch-700/60 dark:text-pitch-100/50">
              En İyi Seri
            </p>
          </div>
          <div>
            <p className="font-mono text-lg font-bold text-pitch-900 dark:text-pitch-100">
              {profile.correctPredictions}
            </p>
            <p className="font-mono text-[10px] uppercase text-pitch-700/60 dark:text-pitch-100/50">Doğru</p>
          </div>
          <div>
            <p className="font-mono text-lg font-bold text-pitch-900 dark:text-pitch-100">
              {profile.totalPredictions}
            </p>
            <p className="font-mono text-[10px] uppercase text-pitch-700/60 dark:text-pitch-100/50">Toplam</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-display text-sm font-semibold text-pitch-900 dark:text-pitch-100">
          Tahmin Geçmişi
        </h2>
        {historyLoading ? (
          <LoadingSpinner label="Tahminler yükleniyor..." />
        ) : historyError ? (
          <ErrorMessage message={historyError} />
        ) : (
          <PredictionHistoryList items={history ?? []} />
        )}
      </section>
    </div>
  );
}
