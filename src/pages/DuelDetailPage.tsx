import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Swords, ArrowLeft, Check, X, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { subscribeDuel, getMatchesByIds, respondToDuel, submitDuelPick, confirmDuelPicks } from '@/services/duelService';
import { Avatar } from '@/components/common/Avatar';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import type { Duel, Match, PredictionChoice } from '@/types';

const REQUIRED_MATCH_COUNT = 5;
const CHOICE_LABELS: Record<PredictionChoice, string> = { HOME: '1', DRAW: 'X', AWAY: '2' };

/**
 * Bir düellonun detayını gösterir: iki oyuncu, 5 maç, sonuç (varsa).
 * ÖNEMLİ: Düello kabul edildiğinde (status='accepted'), her iki oyuncu da
 * BU SAYFADAN, düellodaki 5 maça seçim yapabilir - ama bu seçimler normal
 * `predictions` koleksiyonuna DEĞİL, düellonun kendi dokümanındaki
 * challengerPicks/opponentPicks alanlarına yazılır (bkz. submitDuelPick).
 * 5 seçim de yapıldıktan sonra "Seçimlerimi Onayla" ile KİLİTLENİR - bir
 * daha değiştirilemez (bkz. firestore.rules). Karşı tarafın seçimleri,
 * SADECE karşı taraf KENDİSİ de onayladığında görünür hale gelir - "kapalı
 * zarf" mantığı, kimse önce görüp ona göre seçim yapamaz.
 */
export function DuelDetailPage() {
  const { duelId } = useParams<{ duelId: string }>();
  const { firebaseUser, profile } = useAuth();
  const [duel, setDuel] = useState<Duel | null | undefined>(undefined);
  const [matches, setMatches] = useState<Record<string, Match>>({});
  const [error, setError] = useState<string | null>(null);
  const [responding, setResponding] = useState(false);
  const [submittingMatchId, setSubmittingMatchId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

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
    if (duel) getMatchesByIds(duel.matchIds).then(setMatches);
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

  async function handlePredict(match: Match, choice: PredictionChoice) {
    if (!duel || !firebaseUser) return;
    const locked = new Date(match.kickoffAt).getTime() <= Date.now();
    if (locked || match.result) return;

    const isChallenger = duel.challengerUid === firebaseUser.uid;
    setError(null);
    setSubmittingMatchId(match.id);
    try {
      await submitDuelPick(duel.id, match.id, choice, isChallenger);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Seçim kaydedilemedi.');
    } finally {
      setSubmittingMatchId(null);
    }
  }

  async function handleConfirm() {
    if (!duel || !firebaseUser) return;
    const isChallenger = duel.challengerUid === firebaseUser.uid;
    setConfirming(true);
    setError(null);
    try {
      await confirmDuelPicks(duel.id, isChallenger);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onaylanamadı.');
    } finally {
      setConfirming(false);
    }
  }

  const isChallenger = duel?.challengerUid === firebaseUser?.uid;
  const myPicks = duel ? (isChallenger ? duel.challengerPicks : duel.opponentPicks) : {};
  const myConfirmed = duel ? (isChallenger ? duel.challengerConfirmed : duel.opponentConfirmed) : false;
  const opponentConfirmed = duel ? (isChallenger ? duel.opponentConfirmed : duel.challengerConfirmed) : false;

  const allPicksMade = useMemo(
    () => !!duel && duel.matchIds.every((id) => !!myPicks[id]),
    [duel, myPicks],
  );

  if (duel === undefined) return <LoadingSpinner fullScreen label="Düello yükleniyor..." />;
  if (error && !duel) return <ErrorMessage message={error} />;
  if (!duel) return <ErrorMessage message="Düello bulunamadı." />;
  if (!firebaseUser) return null;

  const isOpponent = duel.opponentUid === firebaseUser.uid;
  const canRespond = isOpponent && duel.status === 'pending';
  const canPredict = duel.status === 'accepted' && !myConfirmed;

  // Karşı tarafın seçimleri, karşı taraf ONAYLADIYSA görünür (maç
  // sonuçlanmasını beklemeye gerek yok - "kapalı zarf açıldı" mantığı).
  // Maç zaten sonuçlanmışsa (hasResult), doğruluk vurgusuyla her zaman görünür.
  const canRevealPicks = duel.status !== 'pending';

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
          confirmed={duel.challengerConfirmed}
          isWinner={duel.status === 'completed' && duel.winnerUid === duel.challengerUid}
        />
        <Swords className="text-scoreboard-amber" size={28} />
        <PlayerBadge
          name={duel.opponentDisplayName}
          avatarUrl={duel.opponentAvatarUrl}
          score={duel.opponentScore}
          confirmed={duel.opponentConfirmed}
          isWinner={duel.status === 'completed' && duel.winnerUid === duel.opponentUid}
        />
      </div>

      {error && <ErrorMessage message={error} />}

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
      {duel.status === 'accepted' && myConfirmed && !opponentConfirmed && (
        <p className="text-center font-mono text-xs text-pitch-700/50 dark:text-pitch-100/40">
          Seçimlerini onayladın ✅ — karşı tarafın onaylaması bekleniyor.
        </p>
      )}
      {duel.status === 'accepted' && !myConfirmed && (
        <p className="text-center font-mono text-xs text-pitch-700/50 dark:text-pitch-100/40">
          Aşağıdaki 5 maça seçimini yap - günlük tahmin hakkını etkilemez, XP kazandırmaz.
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
            const match = matches[matchId];
            const myChoice = myPicks[matchId];
            const kickoffLocked = match && new Date(match.kickoffAt).getTime() <= Date.now();
            const hasResult = !!match?.result;

            const challengerChoice = duel.challengerPicks[matchId];
            const opponentChoice = duel.opponentPicks[matchId];
            const scoreLabel =
              match?.homeGoals != null && match?.awayGoals != null ? `${match.homeGoals}-${match.awayGoals}` : null;

            return (
              <div
                key={matchId}
                className="rounded-lg border border-pitch-700/15 bg-white px-3 py-2.5 dark:border-pitch-700 dark:bg-pitch-800"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="text-pitch-900 dark:text-pitch-100">
                    {match ? `${match.homeTeam} - ${match.awayTeam}` : 'Yükleniyor...'}
                  </span>
                  {scoreLabel && (
                    <span className="font-mono text-xs font-bold text-scoreboard-amber">{scoreLabel}</span>
                  )}
                </div>

                {/* İki oyuncunun seçimi yan yana - ikisi de onayladıysa (ya
                    da maç sonuçlandıysa) görünür; sonuçlanmışsa doğru
                    tahmin yeşil vurgulu. */}
                {canRevealPicks && (duel.challengerConfirmed || hasResult) && (duel.opponentConfirmed || hasResult) && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <PickChip
                      label={duel.challengerDisplayName}
                      choice={challengerChoice}
                      isCorrect={hasResult && challengerChoice === match?.result}
                    />
                    <PickChip
                      label={duel.opponentDisplayName}
                      choice={opponentChoice}
                      isCorrect={hasResult && opponentChoice === match?.result}
                    />
                  </div>
                )}

                {canPredict && match && !match.result && (
                  <div className="mt-2 flex gap-1.5">
                    {(['HOME', 'DRAW', 'AWAY'] as PredictionChoice[]).map((choice) => (
                      <button
                        key={choice}
                        type="button"
                        disabled={kickoffLocked || submittingMatchId === match.id}
                        onClick={() => handlePredict(match, choice)}
                        className={`flex-1 rounded-md border py-1.5 font-mono text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                          myChoice === choice
                            ? 'border-scoreboard-amber bg-scoreboard-amber/15 text-scoreboard-amberDark dark:text-scoreboard-amber'
                            : 'border-pitch-700/20 text-pitch-700/70 hover:bg-pitch-700/5 dark:border-pitch-700 dark:text-pitch-100/60'
                        }`}
                      >
                        {CHOICE_LABELS[choice]}
                      </button>
                    ))}
                  </div>
                )}
                {canPredict && kickoffLocked && !match?.result && (
                  <p className="mt-1 font-mono text-[10px] text-pitch-700/40 dark:text-pitch-100/30">
                    Maç başladı, seçim kilitlendi.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Onayla butonu - 5 seçim de yapılınca çıkar, onaydan sonra kaybolur */}
      {canPredict && (
        <button
          type="button"
          disabled={!allPicksMade || confirming}
          onClick={handleConfirm}
          className="flex items-center justify-center gap-2 rounded-lg bg-scoreboard-amber py-3 font-display
            text-sm font-semibold text-pitch-950 shadow-glow transition hover:brightness-105
            disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Lock size={16} />
          {confirming
            ? 'Onaylanıyor...'
            : allPicksMade
              ? 'Seçimlerimi Onayla (Bir Daha Değiştiremem)'
              : `Önce ${REQUIRED_MATCH_COUNT} maça da seçim yap`}
        </button>
      )}
    </div>
  );
}

function PlayerBadge({
  name,
  avatarUrl,
  score,
  confirmed,
  isWinner,
}: {
  name: string;
  avatarUrl: string | null;
  score: number | null;
  confirmed: boolean;
  isWinner: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`relative rounded-full ${isWinner ? 'ring-4 ring-scoreboard-amber' : ''}`}>
        <Avatar avatarUrl={avatarUrl} size="lg" />
        {confirmed && score === null && (
          <span className="absolute -bottom-1 -right-1 rounded-full bg-pick-correct p-1 text-white">
            <Check size={10} />
          </span>
        )}
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

function PickChip({
  label,
  choice,
  isCorrect,
}: {
  label: string;
  choice: PredictionChoice | undefined;
  isCorrect: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-md border px-2 py-1 text-xs ${
        isCorrect
          ? 'border-pick-correct/40 bg-pick-correct/10 text-pick-correct'
          : 'border-pitch-700/15 text-pitch-700/60 dark:border-pitch-700 dark:text-pitch-100/50'
      }`}
    >
      <span className="truncate">{label}</span>
      <span className="ml-1 shrink-0 font-mono font-bold">{choice ? CHOICE_LABELS[choice] : '—'}</span>
    </div>
  );
}
