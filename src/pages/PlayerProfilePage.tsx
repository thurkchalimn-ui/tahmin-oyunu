import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { usePredictionHistory } from '@/hooks/usePredictionHistory';
import { useFollowCounts } from '@/hooks/useFollowCounts';
import { useUserRank } from '@/hooks/useUserRank';
import { StreakBadge } from '@/components/leaderboard/StreakBadge';
import { Avatar } from '@/components/common/Avatar';
import { FollowButton } from '@/components/common/FollowButton';
import { FollowLists } from '@/components/common/FollowLists';
import { BADGE_ICONS, BADGE_LABELS } from '@/components/common/BadgeIcons';
import { ProfileStatGrid } from '@/components/profile/ProfileStatGrid';
import { PerformanceSummary } from '@/components/profile/PerformanceSummary';
import { RecentPredictionCards } from '@/components/profile/RecentPredictionCards';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';

const STADIUM_GLOW_STYLE = {
  backgroundImage:
    'radial-gradient(ellipse 70% 45% at 20% -15%, rgba(242, 183, 5, 0.18), transparent 60%), ' +
    'radial-gradient(ellipse 60% 40% at 85% -10%, rgba(242, 183, 5, 0.12), transparent 65%)',
};

/**
 * Liderlik tablosunda bir oyuncunun adına tıklandığında açılan, herkese açık
 * salt-okunur profil. ÖNEMLİ: kendi profilinle (ProfilePage.tsx) BİREBİR
 * AYNI görsel dili ve bileşenleri kullanır (stadyum ışığı, büyük avatar,
 * stat ızgarası, performans özeti, rozet kartları, "Son Tahminleri" kart
 * şeridi - bekleyen tahminler dahil) - tek fark: düzenleme/ayar özellikleri
 * (avatar seçici, bildirim tercihleri, hesap silme, "Tümü" linki) burada
 * yok, çünkü bu başka bir kullanıcının salt-okunur profili.
 */
export function PlayerProfilePage() {
  const { uid } = useParams<{ uid: string }>();
  const { firebaseUser } = useAuth();
  const { data: profile, loading: profileLoading, error: profileError } = usePlayerProfile(uid);
  const { data: history } = usePredictionHistory(uid);

  const { followerCount, followingCount } = useFollowCounts(uid);
  const rank = useUserRank(profile?.correctPredictions);

  if (profileLoading) return <LoadingSpinner fullScreen label="Oyuncu yükleniyor..." />;
  if (profileError || !profile) return <ErrorMessage message={profileError ?? 'Oyuncu bulunamadı.'} />;

  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[360px]"
        style={STADIUM_GLOW_STYLE}
      />

      <div className="relative mx-auto flex max-w-xl flex-col gap-6 px-4 py-6">
        <Link
          to="/liderlik"
          className="inline-flex w-fit items-center gap-1 font-mono text-xs text-scoreboard-amber hover:underline"
        >
          <ArrowLeft size={14} />
          Liderlik tablosuna dön
        </Link>

        <div className="flex items-center gap-4">
          <div className="shrink-0 rounded-full shadow-glow">
            <Avatar avatarUrl={profile.avatarUrl} size="xl" />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold text-pitch-900 dark:text-pitch-100">
              {profile.displayName}
            </h1>
            {uid && (
              <div className="mt-1">
                <FollowButton currentUid={firebaseUser?.uid} targetUid={uid} />
              </div>
            )}
          </div>
        </div>

        <ProfileStatGrid followerCount={followerCount} followingCount={followingCount} rank={rank} />

        <PerformanceSummary
          correctPredictions={profile.correctPredictions}
          totalPredictions={profile.totalPredictions}
          bestStreak={profile.bestStreak}
          activityStreak={profile.activityStreak ?? 0}
          memberSince={profile.createdAt}
        />

        <section className="rounded-xl border border-pitch-700/15 bg-gradient-to-b from-white to-pitch-100 p-5 shadow-stadium dark:border-pitch-700 dark:from-pitch-800 dark:to-pitch-900">
          <p className="mb-2 font-mono text-xs uppercase tracking-wide text-pitch-700/60 dark:text-pitch-100/50">
            Güncel Seri
          </p>
          <StreakBadge currentStreak={profile.currentStreak} />
        </section>

        <RecentPredictionCards items={history ?? []} title="Son Tahminleri" />

        {profile.badges.length > 0 && (
          <section>
            <h2 className="mb-2 font-display text-sm font-semibold text-pitch-900 dark:text-pitch-100">
              Rozetler
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {profile.badges.map((badge, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-2 rounded-xl border border-scoreboard-amber/40
                    bg-gradient-to-b from-scoreboard-amber/15 to-transparent p-3 text-center shadow-glow"
                >
                  <span className="text-3xl">{BADGE_ICONS[badge.type]}</span>
                  <span className="font-mono text-[11px] font-semibold text-scoreboard-amberDark dark:text-scoreboard-amber">
                    {BADGE_LABELS[badge.type](badge.value)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {uid && <FollowLists uid={uid} />}
      </div>
    </div>
  );
}
