import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Swords, ArrowLeft, Check, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { subscribeDuel, getMatchesByIds, respondToDuel } from '@/services/duelService';
import { Avatar } from '@/components/common/Avatar';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import type { Duel } from '@/types';

type MatchInfo = { homeTeam: string; awayTeam: string; kickoffAt: string; result: string | null };

/** Bir düellonun detayını gösterir: iki oyuncu, 5 maç, sonuç (varsa). */
export function DuelDetailPage() {
  const { duelId } = useParams<{ duelId: string }>();
  const { firebaseUser, profile } = useAuth();
  const [duel, setDuel] = useState<Duel | null | undefined>(undefined);
  const [matchInfo, setMatchInfo] = useState<Record<string, MatchInfo>>({});
  const [error, setError] = useState<string | null>(null);
  const [responding, setResponding] = useState(false);

  useEffect(() => {
    if (!duelId) return;
    const unsub = subscribeDuel(
      duelId,
      (d) => setDuel(d),
      (msg) => setError(msg),
    );
    return unsub;
  }, [duelId]);

  useEffect(() => {
    if (duel) getMatchesByIds(duel.matchIds).then(setMatchInfo);
  }, [duel]);

  async function handleRespond(accept: boolean) {
    if (!duel || !profile) return;
    setResponding(true);
    try {
      await respondToDuel(duel.id, accept, profile.displayName, duel.challengerUid);
    } finally {
      setResponding(false);
    }
  }

  if (duel === undefined) return <LoadingSpinner fullScreen label="Düello yükleniyor..." />;
  if (error) return <ErrorMessage message={error} />;
  if (!duel) return <ErrorMessage message="Düello bulunamadı." />;
  if (!firebaseUser) return null;

  const isOpponent = duel.opponentUid === firebaseUser.uid;
  const canRespond = isOpponent && duel.status === 'pending';

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
      <Link to="/duello" className="inline-flex w-fit items-center gap-1 font-mono text-xs text-scoreboard-amber">
        <ArrowLeft size={14} />
        Düellolarım
      </Link>

      {/* İki oyuncu, ortada kılıç ikonu */}
      <div className="flex items-center justify-center gap-6">
        <PlayerBadge
          name={duel.challengerDisplayName}
          avatarUrl={duel.challengerAvatarUrl}
          score={duel.challengerScore}
          isWinner={duel.status === 'completed' && duel.winnerUid === duel.challengerUid}
        />
        <Swords className="text-scoreboard-amber" size={28} />
        <PlayerBadge
          name={duel.opponentDisplayName}
          avatarUrl={duel.opponentAvatarUrl}
          score={duel.opponentScore}
          isWinner={duel.status === 'completed' && duel.winnerUid === duel.opponentUid}
        />
      </div>

      {duel.status === 'completed' && (
        <p className="text-center font-display text-sm font-semibold text-pitch-900 dark:text-pitch-100">
          {duel.winnerUid === null
            ? 'Berabere bitti! 🤝'
            : duel.winnerUid === firebaseUser.uid
              ? 'Kazandın! 🏆'
              : `${duel.winnerUid === duel.challengerUid ? duel.challengerDisplayName : duel.opponentDisplayName} kazandı.`}
        </p>
      )}
      {duel.status === 'declined' && (
        <p className="text-center font-mono text-sm text-pick-wrong">Bu davet reddedildi.</p>
      )}
      {duel.status === 'pending' && !canRespond && (
        <p className="text-center font-mono text-xs text-pitch-700/50 dark:text-pitch-100/40">
          Karşı tarafın cevabı bekleniyor...
        </p>
      )}
      {duel.status === 'accepted' && (
        <p className="text-center font-mono text-xs text-pitch-700/50 dark:text-pitch-100/40">
          5 maç sonuçlanınca kazanan otomatik belirlenecek.
        </p>
      )}

      {canRespond && (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={responding}
            onClick={() => handleRespond(true)}
            className="flex-1 rounded-lg bg-pick-correct py-2.5 font-display text-sm font-semibold text-white"
          >
            <Check size={16} className="mr-1 inline" />
            Kabul Et
          </button>
          <button
            type="button"
            disabled={responding}
            onClick={() => handleRespond(false)}
            className="flex-1 rounded-lg bg-pick-wrong py-2.5 font-display text-sm font-semibold text-white"
          >
            <X size={16} className="mr-1 inline" />
            Reddet
          </button>
        </div>
      )}

      {/* 5 maç listesi */}
      <section>
        <h2 className="mb-2 font-display text-sm font-semibold text-pitch-900 dark:text-pitch-100">Maçlar</h2>
        <div className="flex flex-col gap-1.5">
          {duel.matchIds.map((matchId) => {
            const info = matchInfo[matchId];
            return (
              <div
                key={matchId}
                className="flex items-center justify-between rounded-lg border border-pitch-700/15 bg-white px-3 py-2.5 text-sm dark:border-pitch-700 dark:bg-pitch-800"
              >
                <span className="text-pitch-900 dark:text-pitch-100">
                  {info ? `${info.homeTeam} - ${info.awayTeam}` : 'Yükleniyor...'}
                </span>
                {info?.result && (
                  <span className="font-mono text-xs font-bold text-scoreboard-amber">{info.result}</span>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function PlayerBadge({
  name,
  avatarUrl,
  score,
  isWinner,
}: {
  name: string;
  avatarUrl: string | null;
  score: number | null;
  isWinner: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`relative rounded-full ${isWinner ? 'ring-4 ring-scoreboard-amber' : ''}`}>
        <Avatar avatarUrl={avatarUrl} size="lg" />
      </div>
      <p className="max-w-[90px] truncate text-center font-body text-sm font-medium text-pitch-900 dark:text-pitch-100">
        {name}
      </p>
      {score !== null && (
        <p className="font-mono text-xs font-bold text-scoreboard-amber">{score} doğru</p>
      )}
    </div>
  );
}
