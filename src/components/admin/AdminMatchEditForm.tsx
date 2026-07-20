import { useState, type FormEvent } from 'react';
import type { Match } from '@/types';
import { Button } from '@/components/common/Button';

interface AdminMatchEditFormProps {
  match: Match;
  onSave: (updates: {
    homeTeam: string;
    awayTeam: string;
    homeTeamLogo?: string;
    awayTeamLogo?: string;
    league?: string;
    kickoffAt: string;
  }) => Promise<void>;
  onCancel: () => void;
}

/**
 * Mevcut bir maçın takım adı, logo, lig ve saat bilgisini düzenlemek için
 * satır içinde açılan form. Tarih ve gün sırası kasıtlı olarak burada
 * değiştirilemez (seri hesaplamasını etkileyen globalOrder'ı korumak için).
 */
export function AdminMatchEditForm({ match, onSave, onCancel }: AdminMatchEditFormProps) {
  const [homeTeam, setHomeTeam] = useState(match.homeTeam);
  const [awayTeam, setAwayTeam] = useState(match.awayTeam);
  const [homeTeamLogo, setHomeTeamLogo] = useState(match.homeTeamLogo ?? '');
  const [awayTeamLogo, setAwayTeamLogo] = useState(match.awayTeamLogo ?? '');
  const [league, setLeague] = useState(match.league ?? '');
  const [kickoffTime, setKickoffTime] = useState(() => {
    const d = new Date(match.kickoffAt);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!homeTeam.trim() || !awayTeam.trim()) {
      setError('Takım adları boş bırakılamaz.');
      return;
    }
    setIsSaving(true);
    try {
      const kickoffAt = new Date(`${match.date}T${kickoffTime}:00`).toISOString();
      await onSave({
        homeTeam,
        awayTeam,
        homeTeamLogo: homeTeamLogo.trim() || undefined,
        awayTeamLogo: awayTeamLogo.trim() || undefined,
        league,
        kickoffAt,
      });
    } catch {
      setError('Kaydedilemedi.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-2 rounded-lg border border-scoreboard-amber/40
        bg-scoreboard-amber/5 p-3 sm:grid-cols-2"
    >
      <label className="flex flex-col gap-1 text-xs text-pitch-900 dark:text-pitch-100">
        Ev Sahibi
        <input
          value={homeTeam}
          onChange={(e) => setHomeTeam(e.target.value)}
          className="rounded-md border border-pitch-700/20 bg-transparent px-2 py-1.5 text-sm dark:border-pitch-700"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-pitch-900 dark:text-pitch-100">
        Deplasman
        <input
          value={awayTeam}
          onChange={(e) => setAwayTeam(e.target.value)}
          className="rounded-md border border-pitch-700/20 bg-transparent px-2 py-1.5 text-sm dark:border-pitch-700"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-pitch-900 dark:text-pitch-100">
        Ev Sahibi Logo Linki
        <input
          value={homeTeamLogo}
          onChange={(e) => setHomeTeamLogo(e.target.value)}
          placeholder="https://..."
          className="rounded-md border border-pitch-700/20 bg-transparent px-2 py-1.5 font-mono text-xs dark:border-pitch-700"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-pitch-900 dark:text-pitch-100">
        Deplasman Logo Linki
        <input
          value={awayTeamLogo}
          onChange={(e) => setAwayTeamLogo(e.target.value)}
          placeholder="https://..."
          className="rounded-md border border-pitch-700/20 bg-transparent px-2 py-1.5 font-mono text-xs dark:border-pitch-700"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-pitch-900 dark:text-pitch-100">
        Lig
        <input
          value={league}
          onChange={(e) => setLeague(e.target.value)}
          className="rounded-md border border-pitch-700/20 bg-transparent px-2 py-1.5 text-sm dark:border-pitch-700"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-pitch-900 dark:text-pitch-100">
        Başlama Saati
        <input
          type="time"
          value={kickoffTime}
          onChange={(e) => setKickoffTime(e.target.value)}
          className="rounded-md border border-pitch-700/20 bg-transparent px-2 py-1.5 text-sm dark:border-pitch-700"
        />
      </label>

      {error && <p className="text-xs text-pick-wrong sm:col-span-2">{error}</p>}

      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" isLoading={isSaving} className="!px-3 !py-1.5 text-xs">
          Kaydet
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} className="!px-3 !py-1.5 text-xs">
          İptal
        </Button>
      </div>
    </form>
  );
}
