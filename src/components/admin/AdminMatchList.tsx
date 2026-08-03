import { useState } from 'react';
import type { Match, PredictionChoice } from '@/types';
import { formatMatchTime } from '@/utils/dateUtils';
import { assignMatchNumbers } from '@/utils/matchNumbering';
import { TeamLogo } from '@/components/common/TeamLogo';
import { AdminMatchEditForm } from '@/components/admin/AdminMatchEditForm';
import { Button } from '@/components/common/Button';

interface AdminMatchListProps {
  matches: Match[];
  onSetResult: (matchId: string, homeGoals: number, awayGoals: number) => Promise<void>;
  onUndoResult: (matchId: string) => Promise<void>;
  onUpdateMatch: (
    matchId: string,
    updates: {
      homeTeam: string;
      awayTeam: string;
      homeTeamLogo?: string;
      awayTeamLogo?: string;
      league?: string;
      kickoffAt: string;
    },
  ) => Promise<void>;
}

const CHOICE_LABELS: Record<PredictionChoice, string> = { HOME: '1', DRAW: 'X', AWAY: '2' };

/** Skordan 1/X/2 etiketini hesaplar (sadece görüntüleme amaçlı - gerçek hesaplama sunucu/servis tarafında). */
function resultLabelFromScore(home: number, away: number): string {
  if (home > away) return '1';
  if (home < away) return '2';
  return 'X';
}

/**
 * Admin için günün maçlarını listeler; SKOR girerek sonuç girme (sistem
 * otomatik olarak 1/X/2'ye çevirir), maç düzenleme (takım/logo/saat) ve
 * yanlışlıkla girilmiş bir sonucu geri alma imkanı sağlar.
 */
export function AdminMatchList({ matches, onSetResult, onUndoResult, onUpdateMatch }: AdminMatchListProps) {
  const [savingId, setSavingId] = useState<string | null>(null);
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Her maç için ayrı ayrı, henüz kaydedilmemiş skor girişleri (matchId -> "ev,deplasman")
  const [scoreInputs, setScoreInputs] = useState<Record<string, { home: string; away: string }>>({});

  function updateScoreInput(matchId: string, field: 'home' | 'away', value: string) {
    // Sadece rakam kabul et (boş string dahil, silme yapılabilsin diye)
    if (value !== '' && !/^\d{1,2}$/.test(value)) return;
    setScoreInputs((prev) => ({
      ...prev,
      [matchId]: { home: prev[matchId]?.home ?? '', away: prev[matchId]?.away ?? '', [field]: value },
    }));
  }

  async function handleResult(matchId: string) {
    const input = scoreInputs[matchId];
    if (!input || input.home === '' || input.away === '') return;
    const homeGoals = Number(input.home);
    const awayGoals = Number(input.away);

    setSavingId(matchId);
    try {
      await onSetResult(matchId, homeGoals, awayGoals);
      setScoreInputs((prev) => {
        const next = { ...prev };
        delete next[matchId];
        return next;
      });
    } finally {
      setSavingId(null);
    }
  }

  async function handleUndo(matchId: string, label: string) {
    const confirmed = window.confirm(
      `${label} maçının sonucunu geri almak istediğine emin misin? Bu maça ait tüm tahminler yeniden "sonuçlanmamış" duruma dönecek ve kullanıcıların serileri buna göre güncellenecek.`,
    );
    if (!confirmed) return;

    setUndoingId(matchId);
    try {
      await onUndoResult(matchId);
    } finally {
      setUndoingId(null);
    }
  }

  if (matches.length === 0) {
    return <p className="text-sm text-pitch-700/60 dark:text-pitch-100/50">Bu tarihte maç yok.</p>;
  }

  // Admin listesindeki #N etiketi, dayOrder (eklenme sırası) yerine gerçek
  // başlama saatine göre hesaplanır - böylece her zaman doğru kronolojik sırayı yansıtır.
  const numberMap = assignMatchNumbers(matches);

  return (
    <div className="flex flex-col gap-2">
      {matches.map((match) =>
        editingId === match.id ? (
          <AdminMatchEditForm
            key={match.id}
            match={match}
            onCancel={() => setEditingId(null)}
            onSave={async (updates) => {
              await onUpdateMatch(match.id, updates);
              setEditingId(null);
            }}
          />
        ) : (
          <div
            key={match.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border
              border-pitch-700/15 bg-white p-3 dark:border-pitch-700 dark:bg-pitch-800"
          >
            <div>
              <p className="flex items-center gap-1.5 font-body text-sm font-medium text-pitch-900 dark:text-pitch-100">
                <TeamLogo name={match.homeTeam} logoUrl={match.homeTeamLogo} size="sm" />
                #{numberMap.get(match.id) ?? 0} {match.homeTeam} vs {match.awayTeam}
                <TeamLogo name={match.awayTeam} logoUrl={match.awayTeamLogo} size="sm" />
              </p>
              <p className="font-mono text-xs text-pitch-700/50 dark:text-pitch-100/40">
                {formatMatchTime(match.kickoffAt)}
              </p>
            </div>

            {match.result !== null ? (
              // --- Sonuç zaten girilmiş: skor + 1/X/2 rozeti + geri al butonu ---
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 rounded-md bg-pick-correct/15 px-3 py-1.5 font-mono text-xs font-bold text-pick-correct">
                  ✓{' '}
                  {match.liveScore
                    ? `${match.liveScore.homeGoals}-${match.liveScore.awayGoals} (${CHOICE_LABELS[match.result]})`
                    : `Sonuçlandı (${CHOICE_LABELS[match.result]})`}
                </span>
                <Button
                  variant="danger"
                  isLoading={undoingId === match.id}
                  onClick={() => handleUndo(match.id, `${match.homeTeam} - ${match.awayTeam}`)}
                  className="!px-2.5 !py-1.5 text-xs"
                >
                  Geri Al
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setEditingId(match.id)}
                  className="!px-2.5 !py-1.5 text-xs"
                >
                  Düzenle
                </Button>
              </div>
            ) : (
              // --- Sonuç henüz girilmemiş: skor giriş kutuları ---
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={scoreInputs[match.id]?.home ?? ''}
                  onChange={(e) => updateScoreInput(match.id, 'home', e.target.value)}
                  disabled={savingId === match.id}
                  aria-label={`${match.homeTeam} gol sayısı`}
                  className="h-9 w-11 rounded-md border border-pitch-700/20 bg-pitch-100 text-center
                    font-mono text-sm font-bold text-pitch-900 disabled:opacity-50 dark:border-pitch-700
                    dark:bg-pitch-700 dark:text-pitch-100"
                />
                <span className="font-mono text-sm text-pitch-700/50 dark:text-pitch-100/40">-</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={scoreInputs[match.id]?.away ?? ''}
                  onChange={(e) => updateScoreInput(match.id, 'away', e.target.value)}
                  disabled={savingId === match.id}
                  aria-label={`${match.awayTeam} gol sayısı`}
                  className="h-9 w-11 rounded-md border border-pitch-700/20 bg-pitch-100 text-center
                    font-mono text-sm font-bold text-pitch-900 disabled:opacity-50 dark:border-pitch-700
                    dark:bg-pitch-700 dark:text-pitch-100"
                />

                {scoreInputs[match.id]?.home !== undefined &&
                  scoreInputs[match.id]?.away !== undefined &&
                  scoreInputs[match.id]?.home !== '' &&
                  scoreInputs[match.id]?.away !== '' && (
                    <span className="font-mono text-[10px] text-pitch-700/50 dark:text-pitch-100/40">
                      →{' '}
                      {resultLabelFromScore(
                        Number(scoreInputs[match.id]!.home),
                        Number(scoreInputs[match.id]!.away),
                      )}
                    </span>
                  )}

                <Button
                  isLoading={savingId === match.id}
                  disabled={
                    !scoreInputs[match.id] ||
                    scoreInputs[match.id]?.home === '' ||
                    scoreInputs[match.id]?.away === ''
                  }
                  onClick={() => handleResult(match.id)}
                  className="!px-2.5 !py-1.5 text-xs"
                >
                  Kaydet
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setEditingId(match.id)}
                  className="!px-2.5 !py-1.5 text-xs"
                >
                  Düzenle
                </Button>
              </div>
            )}
          </div>
        ),
      )}
    </div>
  );
}
