import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { usePredictionHistory } from '@/hooks/usePredictionHistory';
import { StreakBadge } from '@/components/leaderboard/StreakBadge';
import { PredictionHistoryList } from '@/components/leaderboard/PredictionHistoryList';
import { PeriodTabs } from '@/components/leaderboard/PeriodTabs';
import { Avatar } from '@/components/common/Avatar';
import { FollowButton } from '@/components/common/FollowButton';
import { FollowLists } from '@/components/common/FollowLists';
import { BADGE_ICONS, BADGE_LABELS } from '@/components/common/BadgeIcons';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { getPeriodRange, type StatsPeriod } from '@/utils/periodUtils';

/** Liderlik tablosunda bir oyuncunun adına tıklandığında açılan, herkese açık salt-okunur profil. */
export function PlayerProfilePage() {
  const { uid } = useParams<{ uid: string }>();
  const { firebaseUser } = useAuth();
  const { data: profile, loading: profileLoading, error: profileError } = usePlayerProfile(uid);
  const { data: history, loading: historyLoading, error: historyError } = usePredictionHistory(uid);
  const [tab, setTab] = useState<StatsPeriod>('all');

  // Seçilen döneme (hafta/ay/genel) göre tahmin geçmişini filtrele - ekstra
  // Firestore sorgusu gerekmeden, zaten çekilmiş listeden istemci tarafında.
  const filteredHistory = useMemo(() => {
    if (!history) return null;
    const range = getPeriodRange(tab);
    if (!range) return history;
    return history.filter((item) => item.match.date >= range.start && item.match.date < range.end);
  }, [history, tab]);

  const periodStats = useMemo(() => {
    if (!filteredHistory) return { total: 0, correct: 0 };
    const resolved = filteredHistory.filter((item) => item.prediction.isCorrect !== null);
    return {
      total: resolved.length,
      correct: resolved.filter((item) => item.prediction.isCorrect === true).length,
    };
  }, [filteredHistory]);

  if (profileLoading) return <LoadingSpinner fullScreen label="Oyuncu yükleniyor..." />;
  if (profileError || !profile) return <ErrorMessage message={profileError ?? 'Oyuncu bulunamadı.'} />;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-6">
      <Link to="/liderlik" className="font-mono text-xs text-scoreboard-amber">
        ← Liderlik tablosuna dön
      </Link>

      <div className="flex items-center gap-3">
        <Avatar avatarUrl={profile.avatarUrl} size="lg" />
        <h1 className="font-display text-xl font-semibold text-pitch-900 dark:text-pitch-100">
          {profile.displayName}
        </h1>
      </div>

      {uid && <FollowButton currentUid={firebaseUser?.uid} targetUid={uid} />}

      {uid && <FollowLists uid={uid} />}

      <div>
        <PeriodTabs value={tab} onChange={setTab} />
      </div>

      <section className="rounded-xl border border-pitch-700/15 bg-white p-5 dark:border-pitch-700 dark:bg-pitch-800">
        <p className="mb-2 font-mono text-xs uppercase tracking-wide text-pitch-700/60 dark:text-pitch-100/50">
          Güncel Seri
        </p>
        <StreakBadge currentStreak={profile.currentStreak} />
        {tab === 'all' ? (
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
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-pitch-700/10 pt-4 text-center dark:border-pitch-100/10">
            <div>
              <p className="font-mono text-lg font-bold text-pitch-900 dark:text-pitch-100">
                {periodStats.correct}
              </p>
              <p className="font-mono text-[10px] uppercase text-pitch-700/60 dark:text-pitch-100/50">
                Doğru ({tab === 'week' ? 'Bu Hafta' : 'Bu Ay'})
              </p>
            </div>
            <div>
              <p className="font-mono text-lg font-bold text-pitch-900 dark:text-pitch-100">
                {periodStats.total}
              </p>
              <p className="font-mono text-[10px] uppercase text-pitch-700/60 dark:text-pitch-100/50">
                Toplam ({tab === 'week' ? 'Bu Hafta' : 'Bu Ay'})
              </p>
            </div>
          </div>
        )}
      </section>

      {profile.badges.length > 0 && (
        <section>
          <h2 className="mb-2 font-display text-sm font-semibold text-pitch-900 dark:text-pitch-100">
            Rozetler
          </h2>
          <div className="flex flex-wrap gap-2">
            {profile.badges.map((badge, i) => (
              <span
                key={i}
                className="rounded-full bg-scoreboard-amber/15 px-3 py-1.5 font-mono text-xs text-scoreboard-amberDark dark:text-scoreboard-amber"
              >
                {BADGE_ICONS[badge.type]} {BADGE_LABELS[badge.type](badge.value)}
              </span>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 font-display text-sm font-semibold text-pitch-900 dark:text-pitch-100">
          Tahmin Geçmişi {tab !== 'all' && `(${tab === 'week' ? 'Bu Hafta' : 'Bu Ay'})`}
        </h2>
        {historyLoading ? (
          <LoadingSpinner label="Tahminler yükleniyor..." />
        ) : historyError ? (
          <ErrorMessage message={historyError} />
        ) : (
          <PredictionHistoryList items={filteredHistory ?? []} />
        )}
      </section>
    </div>
  );
}
