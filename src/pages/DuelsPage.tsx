import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Swords, Plus, Check, X, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { subscribeMyDuels, respondToDuel } from '@/services/duelService';
import { Avatar } from '@/components/common/Avatar';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { usePageTitle } from '@/hooks/usePageTitle';
import type { Duel } from '@/types';

/**
 * Düellolarım sayfası: kabul bekleyen davetler, aktif düellolar ve
 * tamamlanmış düellolar (sonuçlarıyla) - üç ayrı bölüm halinde.
 */
export function DuelsPage() {
  usePageTitle('Düellolarım');
  const { firebaseUser, profile } = useAuth();
  const [duels, setDuels] = useState<Duel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseUser) return;
    const unsub = subscribeMyDuels(
      firebaseUser.uid,
      (list) => {
        setDuels(list);
        setLoading(false);
      },
      (msg) => {
        setError(msg);
        setLoading(false);
      },
    );
    return unsub;
  }, [firebaseUser]);

  async function handleRespond(duel: Duel, accept: boolean) {
    if (!profile) return;
    setRespondingId(duel.id);
    try {
      await respondToDuel(duel.id, accept, profile.displayName, duel.challengerUid);
    } finally {
      setRespondingId(null);
    }
  }

  if (!firebaseUser) return null;

  const pendingForMe = duels.filter((d) => d.status === 'pending' && d.opponentUid === firebaseUser.uid);
  const sentByMe = duels.filter((d) => d.status === 'pending' && d.challengerUid === firebaseUser.uid);
  const active = duels.filter((d) => d.status === 'accepted');
  const completed = duels.filter((d) => d.status === 'completed' || d.status === 'declined');

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 font-display text-xl font-semibold text-pitch-900 dark:text-pitch-100">
          <Swords className="text-scoreboard-amber" size={22} />
          Düellolarım
        </h1>
        <Link
          to="/duello/yeni"
          className="flex items-center gap-1.5 rounded-lg bg-scoreboard-amber px-3 py-1.5 font-display text-xs font-semibold text-pitch-950 shadow-glow"
        >
          <Plus size={14} />
          Yeni Düello
        </Link>
      </div>

      {loading ? (
        <LoadingSpinner label="Düellolar yükleniyor..." />
      ) : error ? (
        <ErrorMessage message={error} />
      ) : duels.length === 0 ? (
        <p className="rounded-lg border border-dashed border-pitch-700/20 p-6 text-center font-mono text-xs text-pitch-700/50 dark:border-pitch-700 dark:text-pitch-100/40">
          Henüz hiç düellon yok. Bir arkadaşına meydan oku!
        </p>
      ) : (
        <>
          {pendingForMe.length > 0 && (
            <DuelGroup title="Kabul Bekleyen Davetler">
              {pendingForMe.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-lg border border-scoreboard-amber/40 bg-scoreboard-amber/5 px-3 py-2.5"
                >
                  <Link to={`/duello/${d.id}`} className="flex items-center gap-2">
                    <Avatar avatarUrl={d.challengerAvatarUrl} size="sm" />
                    <span className="text-sm text-pitch-900 dark:text-pitch-100">
                      <strong>{d.challengerDisplayName}</strong> seni davet etti
                    </span>
                  </Link>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      disabled={respondingId === d.id}
                      onClick={() => handleRespond(d, true)}
                      className="rounded-md bg-pick-correct/15 p-1.5 text-pick-correct hover:bg-pick-correct/25"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      type="button"
                      disabled={respondingId === d.id}
                      onClick={() => handleRespond(d, false)}
                      className="rounded-md bg-pick-wrong/15 p-1.5 text-pick-wrong hover:bg-pick-wrong/25"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </DuelGroup>
          )}

          {sentByMe.length > 0 && (
            <DuelGroup title="Cevap Bekleyen Davetlerim">
              {sentByMe.map((d) => (
                <DuelRow key={d.id} duel={d} myUid={firebaseUser.uid} statusLabel="Cevap bekleniyor..." />
              ))}
            </DuelGroup>
          )}

          {active.length > 0 && (
            <DuelGroup title="Aktif Düellolar">
              {active.map((d) => (
                <DuelRow key={d.id} duel={d} myUid={firebaseUser.uid} statusLabel="Maçlar bekleniyor..." />
              ))}
            </DuelGroup>
          )}

          {completed.length > 0 && (
            <DuelGroup title="Geçmiş">
              {completed.map((d) => (
                <DuelRow key={d.id} duel={d} myUid={firebaseUser.uid} />
              ))}
            </DuelGroup>
          )}
        </>
      )}
    </div>
  );
}

function DuelGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 font-display text-sm font-semibold text-pitch-900 dark:text-pitch-100">{title}</h2>
      <div className="flex flex-col gap-1.5">{children}</div>
    </section>
  );
}

function DuelRow({ duel, myUid, statusLabel }: { duel: Duel; myUid: string; statusLabel?: string }) {
  const isChallenger = duel.challengerUid === myUid;
  const opponentName = isChallenger ? duel.opponentDisplayName : duel.challengerDisplayName;
  const opponentAvatar = isChallenger ? duel.opponentAvatarUrl : duel.challengerAvatarUrl;

  const myScore = isChallenger ? duel.challengerScore : duel.opponentScore;
  const opponentScore = isChallenger ? duel.opponentScore : duel.challengerScore;

  let resultLabel = statusLabel;
  let resultColor = 'text-pitch-700/60 dark:text-pitch-100/50';
  if (duel.status === 'declined') {
    resultLabel = 'Reddedildi';
  } else if (duel.status === 'completed') {
    if (duel.winnerUid === myUid) {
      resultLabel = `Kazandın! ${myScore}-${opponentScore}`;
      resultColor = 'text-pick-correct font-semibold';
    } else if (duel.winnerUid === null) {
      resultLabel = `Berabere ${myScore}-${opponentScore}`;
    } else {
      resultLabel = `Kaybettin ${myScore}-${opponentScore}`;
      resultColor = 'text-pick-wrong';
    }
  }

  return (
    <Link
      to={`/duello/${duel.id}`}
      className="flex items-center justify-between rounded-lg border border-pitch-700/15 bg-white px-3 py-2.5 hover:bg-pitch-700/5 dark:border-pitch-700 dark:bg-pitch-800 dark:hover:bg-pitch-700/30"
    >
      <div className="flex items-center gap-2">
        <Avatar avatarUrl={opponentAvatar} size="sm" />
        <span className="text-sm text-pitch-900 dark:text-pitch-100">{opponentName}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`font-mono text-xs ${resultColor}`}>{resultLabel}</span>
        <ChevronRight size={16} className="text-pitch-700/30 dark:text-pitch-100/20" />
      </div>
    </Link>
  );
}
