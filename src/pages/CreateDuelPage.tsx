import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Swords, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMatches } from '@/hooks/useMatches';
import { getFollowingUids } from '@/services/followService';
import { usePlayerProfilesByIds } from '@/hooks/usePlayerProfilesByIds';
import { createDuel } from '@/services/duelService';
import { Avatar } from '@/components/common/Avatar';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { todayKey } from '@/utils/dateUtils';

const REQUIRED_MATCH_COUNT = 5;

/**
 * Yeni düello oluşturma sayfası - iki adım: (1) takip ettiğin bir arkadaşı
 * seç, (2) bugünün maçlarından TAM OLARAK 5 tanesini seç. Gönderince davet
 * "pending" durumda oluşturulur, karşı taraf kabul/red edene kadar bekler.
 */
export function CreateDuelPage() {
  const { firebaseUser, profile } = useAuth();
  const navigate = useNavigate();
  const today = todayKey();

  const [followingUids, setFollowingUids] = useState<string[]>([]);
  const [selectedFriendUid, setSelectedFriendUid] = useState<string | null>(null);
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (firebaseUser) getFollowingUids(firebaseUser.uid).then(setFollowingUids);
  }, [firebaseUser]);

  const { data: friendProfiles, loading: friendsLoading } = usePlayerProfilesByIds(followingUids);
  const { data: matches, loading: matchesLoading } = useMatches(today);

  // Sadece henüz sonuçlanmamış maçlar seçilebilir (sonuçlanmış bir maçla düello anlamsız olurdu)
  const pendingMatches = useMemo(() => (matches ?? []).filter((m) => m.result === null), [matches]);

  function toggleMatch(matchId: string) {
    setSelectedMatchIds((prev) => {
      if (prev.includes(matchId)) return prev.filter((id) => id !== matchId);
      if (prev.length >= REQUIRED_MATCH_COUNT) return prev; // 5'ten fazlasına izin verme
      return [...prev, matchId];
    });
  }

  async function handleSubmit() {
    if (!firebaseUser || !profile || !selectedFriendUid) return;
    if (selectedMatchIds.length !== REQUIRED_MATCH_COUNT) {
      setError(`Tam olarak ${REQUIRED_MATCH_COUNT} maç seçmelisin.`);
      return;
    }
    const friend = friendProfiles.find((f) => f.uid === selectedFriendUid);
    if (!friend) return;

    setError(null);
    setSubmitting(true);
    try {
      await createDuel(
        firebaseUser.uid,
        profile.displayName,
        profile.avatarUrl ?? null,
        friend.uid,
        friend.displayName,
        friend.avatarUrl ?? null,
        selectedMatchIds,
      );
      navigate('/duello');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Düello oluşturulamadı.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
      <h1 className="flex items-center gap-2 font-display text-xl font-semibold text-pitch-900 dark:text-pitch-100">
        <Swords className="text-scoreboard-amber" size={22} />
        Yeni Düello
      </h1>

      {error && <ErrorMessage message={error} />}

      {/* Adım 1: Arkadaş seç */}
      <section>
        <h2 className="mb-2 font-display text-sm font-semibold text-pitch-900 dark:text-pitch-100">
          1. Bir arkadaşını seç
        </h2>
        {friendsLoading ? (
          <LoadingSpinner label="Arkadaşların yükleniyor..." />
        ) : friendProfiles.length === 0 ? (
          <p className="rounded-lg border border-dashed border-pitch-700/20 p-4 text-center font-mono text-xs text-pitch-700/50 dark:border-pitch-700 dark:text-pitch-100/40">
            Düello göndermek için önce birini takip etmen gerekiyor.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {friendProfiles.map((f) => (
              <button
                key={f.uid}
                type="button"
                onClick={() => setSelectedFriendUid(f.uid)}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
                  selectedFriendUid === f.uid
                    ? 'border-scoreboard-amber bg-scoreboard-amber/10 text-scoreboard-amberDark dark:text-scoreboard-amber'
                    : 'border-pitch-700/20 text-pitch-900 hover:bg-pitch-700/5 dark:border-pitch-700 dark:text-pitch-100'
                }`}
              >
                <Avatar avatarUrl={f.avatarUrl} size="sm" />
                {f.displayName}
                {selectedFriendUid === f.uid && <Check size={14} />}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Adım 2: 5 maç seç */}
      <section>
        <h2 className="mb-2 flex items-center justify-between font-display text-sm font-semibold text-pitch-900 dark:text-pitch-100">
          2. Bugünün maçlarından 5 tanesini seç
          <span className="font-mono text-xs font-normal text-scoreboard-amber">
            {selectedMatchIds.length} / {REQUIRED_MATCH_COUNT}
          </span>
        </h2>
        {matchesLoading ? (
          <LoadingSpinner label="Maçlar yükleniyor..." />
        ) : pendingMatches.length === 0 ? (
          <p className="rounded-lg border border-dashed border-pitch-700/20 p-4 text-center font-mono text-xs text-pitch-700/50 dark:border-pitch-700 dark:text-pitch-100/40">
            Bugün seçilebilecek maç yok.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {pendingMatches.map((m) => {
              const selected = selectedMatchIds.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleMatch(m.id)}
                  disabled={!selected && selectedMatchIds.length >= REQUIRED_MATCH_COUNT}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition disabled:opacity-40 ${
                    selected
                      ? 'border-scoreboard-amber bg-scoreboard-amber/10'
                      : 'border-pitch-700/15 hover:bg-pitch-700/5 dark:border-pitch-700 dark:hover:bg-pitch-700/30'
                  }`}
                >
                  <span className="text-pitch-900 dark:text-pitch-100">
                    {m.homeTeam} - {m.awayTeam}
                  </span>
                  {selected && <Check size={16} className="text-scoreboard-amber" />}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || !selectedFriendUid || selectedMatchIds.length !== REQUIRED_MATCH_COUNT}
        className="rounded-lg bg-scoreboard-amber py-3 font-display text-sm font-semibold text-pitch-950
          shadow-glow transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? 'Gönderiliyor...' : 'Düello Daveti Gönder'}
      </button>
    </div>
  );
}
