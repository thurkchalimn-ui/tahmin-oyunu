import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getLeague, getLeagueLeaderboard, addLeagueMember, removeLeagueMember, deleteLeague } from '@/services/leagueService';
import { getFollowingUids } from '@/services/followService';
import { usePlayerProfilesByIds } from '@/hooks/usePlayerProfilesByIds';
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';
import { Avatar } from '@/components/common/Avatar';
import { Button } from '@/components/common/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { usePageTitle } from '@/hooks/usePageTitle';
import type { League, UserProfile } from '@/types';

/** Tek bir özel ligin liderlik tablosunu ve (kurucuysa) üye yönetimini gösterir. */
export function LeaguePage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { firebaseUser } = useAuth();
  const navigate = useNavigate();

  const [league, setLeague] = useState<League | null>(null);
  const [leaderboard, setLeaderboard] = useState<UserProfile[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [followingUids, setFollowingUids] = useState<string[]>([]);

  usePageTitle(league ? league.name : 'Lig');

  async function loadLeague() {
    if (!leagueId) return;
    setLoading(true);
    try {
      const found = await getLeague(leagueId);
      if (!found) {
        setError('Lig bulunamadı ya da bu lige erişim iznin yok.');
        return;
      }
      setLeague(found);
      const board = await getLeagueLeaderboard(found.memberUids);
      setLeaderboard(board);
    } catch {
      setError('Lig yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLeague();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId]);

  useEffect(() => {
    if (firebaseUser) getFollowingUids(firebaseUser.uid).then(setFollowingUids);
  }, [firebaseUser]);

  const isOwner = league && firebaseUser && league.ownerUid === firebaseUser.uid;
  const addableUids = followingUids.filter((uid) => !league?.memberUids.includes(uid));
  const { data: addableProfiles } = usePlayerProfilesByIds(addableUids);
  const { data: memberProfiles } = usePlayerProfilesByIds(league?.memberUids ?? []);

  async function handleAddMember(uid: string) {
    if (!leagueId) return;
    await addLeagueMember(leagueId, uid);
    await loadLeague();
  }

  async function handleRemoveMember(uid: string) {
    if (!leagueId) return;
    const confirmed = window.confirm('Bu üyeyi ligden çıkarmak istediğine emin misin?');
    if (!confirmed) return;
    await removeLeagueMember(leagueId, uid);
    await loadLeague();
  }

  async function handleDeleteLeague() {
    if (!leagueId) return;
    const confirmed = window.confirm('Bu ligi kalıcı olarak silmek istediğine emin misin?');
    if (!confirmed) return;
    await deleteLeague(leagueId);
    navigate('/ligler');
  }

  async function handleLeaveLeague() {
    if (!leagueId || !firebaseUser) return;
    const confirmed = window.confirm('Bu ligden ayrılmak istediğine emin misin?');
    if (!confirmed) return;
    await removeLeagueMember(leagueId, firebaseUser.uid);
    navigate('/ligler');
  }

  if (loading) return <LoadingSpinner fullScreen label="Lig yükleniyor..." />;
  if (error || !league) return <ErrorMessage message={error ?? 'Lig bulunamadı.'} />;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link to="/ligler" className="mb-4 inline-block font-mono text-xs text-scoreboard-amber">
        ← Liglerime dön
      </Link>

      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold text-pitch-900 dark:text-pitch-100">
          {league.name}
        </h1>
        {isOwner ? (
          <Button variant="danger" onClick={handleDeleteLeague} className="!px-3 !py-1.5 text-xs">
            Ligi Sil
          </Button>
        ) : (
          <Button variant="ghost" onClick={handleLeaveLeague} className="!px-3 !py-1.5 text-xs">
            Ligden Ayrıl
          </Button>
        )}
      </div>

      <LeaderboardTable users={leaderboard ?? []} currentUserId={firebaseUser?.uid} mode="all" />

      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold text-pitch-900 dark:text-pitch-100">
            Üyeler ({memberProfiles.length})
          </h2>
          {isOwner && (
            <Button variant="ghost" onClick={() => setShowAddMember((v) => !v)} className="!px-3 !py-1.5 text-xs">
              {showAddMember ? 'Vazgeç' : '+ Üye Ekle'}
            </Button>
          )}
        </div>

        {showAddMember && (
          <div className="mb-3 flex flex-col gap-1 rounded-lg border border-pitch-700/15 bg-white p-3 dark:border-pitch-700 dark:bg-pitch-800">
            {addableProfiles.length === 0 ? (
              <p className="font-mono text-xs text-pitch-700/50 dark:text-pitch-100/40">
                Eklenebilecek kimse yok - takip ettiklerinin hepsi zaten bu ligde.
              </p>
            ) : (
              addableProfiles.map((p) => (
                <div key={p.uid} className="flex items-center justify-between gap-2 py-1">
                  <span className="flex items-center gap-2 text-sm text-pitch-900 dark:text-pitch-100">
                    <Avatar avatarUrl={p.avatarUrl} size="sm" />
                    {p.displayName}
                  </span>
                  <Button onClick={() => handleAddMember(p.uid)} className="!px-2.5 !py-1 text-xs">
                    Ekle
                  </Button>
                </div>
              ))
            )}
          </div>
        )}

        <div className="flex flex-col gap-1">
          {memberProfiles.map((p) => (
            <div
              key={p.uid}
              className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-pitch-700/5 dark:hover:bg-pitch-700/40"
            >
              <Link to={`/oyuncu/${p.uid}`} className="flex items-center gap-2 text-sm text-pitch-900 dark:text-pitch-100">
                <Avatar avatarUrl={p.avatarUrl} size="sm" />
                {p.displayName}
                {p.uid === league.ownerUid && (
                  <span className="font-mono text-[10px] text-pitch-700/50 dark:text-pitch-100/40">(kurucu)</span>
                )}
              </Link>
              {isOwner && p.uid !== league.ownerUid && (
                <button
                  onClick={() => handleRemoveMember(p.uid)}
                  className="font-mono text-xs text-pick-wrong hover:underline"
                >
                  Çıkar
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
