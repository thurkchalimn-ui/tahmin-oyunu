import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserLeagues } from '@/hooks/useUserLeagues';
import { getFollowingUids } from '@/services/followService';
import { createLeague } from '@/services/leagueService';
import { usePlayerProfilesByIds } from '@/hooks/usePlayerProfilesByIds';
import { Avatar } from '@/components/common/Avatar';
import { Button } from '@/components/common/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { isNonEmpty } from '@/utils/validators';

/** Kullanıcının üyesi olduğu özel ligleri listeler ve yeni bir lig kurma formu sunar. */
export function LeaguesPage() {
  const { firebaseUser } = useAuth();
  const { data: leagues, loading, error } = useUserLeagues(firebaseUser?.uid);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [followingUids, setFollowingUids] = useState<string[]>([]);
  const { data: followingProfiles } = usePlayerProfilesByIds(followingUids);

  const [leagueName, setLeagueName] = useState('');
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (firebaseUser) getFollowingUids(firebaseUser.uid).then(setFollowingUids);
  }, [firebaseUser]);

  function toggleSelected(uid: string) {
    setSelectedUids((prev) => (prev.includes(uid) ? prev.filter((u) => u !== uid) : [...prev, uid]));
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreateError(null);
    if (!isNonEmpty(leagueName)) {
      setCreateError('Lig adı boş olamaz.');
      return;
    }
    setIsCreating(true);
    try {
      await createLeague(leagueName, firebaseUser!.uid, selectedUids);
      setLeagueName('');
      setSelectedUids([]);
      setShowCreateForm(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Lig kurulamadı.');
    } finally {
      setIsCreating(false);
    }
  }

  if (!firebaseUser) return <LoadingSpinner fullScreen label="Yükleniyor..." />;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold text-pitch-900 dark:text-pitch-100">
          Liglerim
        </h1>
        <Button onClick={() => setShowCreateForm((v) => !v)} className="text-xs">
          {showCreateForm ? 'Vazgeç' : '+ Yeni Lig Kur'}
        </Button>
      </div>

      {showCreateForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 flex flex-col gap-3 rounded-xl border border-pitch-700/15 bg-white p-4 dark:border-pitch-700 dark:bg-pitch-800"
        >
          <label className="flex flex-col gap-1 text-sm text-pitch-900 dark:text-pitch-100">
            Lig Adı
            <input
              value={leagueName}
              onChange={(e) => setLeagueName(e.target.value)}
              placeholder="Ör. Mahalle Ligi"
              className="rounded-md border border-pitch-700/20 bg-transparent px-3 py-2 dark:border-pitch-700"
            />
          </label>

          <div>
            <p className="mb-2 font-mono text-xs uppercase tracking-wide text-pitch-700/60 dark:text-pitch-100/50">
              Üye Ekle (takip ettiklerinden seç)
            </p>
            {followingProfiles.length === 0 ? (
              <p className="font-mono text-xs text-pitch-700/50 dark:text-pitch-100/40">
                Henüz kimseyi takip etmiyorsun - önce bir oyuncunun profiline gidip "Takip Et"'e bas.
              </p>
            ) : (
              <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
                {followingProfiles.map((p) => (
                  <label
                    key={p.uid}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-pitch-700/5 dark:hover:bg-pitch-700/40"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUids.includes(p.uid)}
                      onChange={() => toggleSelected(p.uid)}
                      className="h-4 w-4 accent-scoreboard-amber"
                    />
                    <Avatar avatarUrl={p.avatarUrl} size="sm" />
                    <span className="text-sm text-pitch-900 dark:text-pitch-100">{p.displayName}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {createError && <p className="text-sm text-pick-wrong">{createError}</p>}
          <Button type="submit" isLoading={isCreating} className="self-start">
            Ligi Kur
          </Button>
        </form>
      )}

      {loading ? (
        <LoadingSpinner label="Ligler yükleniyor..." />
      ) : error ? (
        <ErrorMessage message={error} />
      ) : !leagues || leagues.length === 0 ? (
        <p className="rounded-xl border border-dashed border-pitch-700/20 p-8 text-center font-body text-sm text-pitch-700/60 dark:border-pitch-700 dark:text-pitch-100/50">
          Henüz bir lige üye değilsin. Arkadaşlarını takip edip yukarıdan yeni bir lig kur!
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {leagues.map((league) => (
            <Link
              key={league.id}
              to={`/lig/${league.id}`}
              className="flex items-center justify-between rounded-xl border border-pitch-700/15 bg-white p-4
                hover:border-scoreboard-amber dark:border-pitch-700 dark:bg-pitch-800"
            >
              <div>
                <p className="font-display font-semibold text-pitch-900 dark:text-pitch-100">{league.name}</p>
                <p className="font-mono text-xs text-pitch-700/60 dark:text-pitch-100/50">
                  {league.memberUids.length} üye
                  {league.ownerUid === firebaseUser.uid && ' · Kurucusun'}
                </p>
              </div>
              <span className="font-mono text-xs text-scoreboard-amber">→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
