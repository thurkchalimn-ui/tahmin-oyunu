import { useState, type FormEvent } from 'react';
import { Button } from '@/components/common/Button';
import { isNonEmpty } from '@/utils/validators';
import { todayKey } from '@/utils/dateUtils';

interface AdminMatchFormProps {
  onSubmit: (input: {
    date: string;
    dayOrder: number;
    homeTeam: string;
    awayTeam: string;
    homeTeamLogo?: string;
    awayTeamLogo?: string;
    league?: string;
    kickoffAt: string;
  }) => Promise<void>;
  nextDayOrder: number;
}

/** Admin panelinde günün maçlarını tek tek eklemek için kullanılan form. */
export function AdminMatchForm({ onSubmit, nextDayOrder }: AdminMatchFormProps) {
  const [date, setDate] = useState(todayKey());
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [homeTeamLogo, setHomeTeamLogo] = useState('');
  const [awayTeamLogo, setAwayTeamLogo] = useState('');
  const [league, setLeague] = useState('');
  const [kickoffTime, setKickoffTime] = useState('20:00');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isNonEmpty(homeTeam) || !isNonEmpty(awayTeam)) {
      setError('Takım adları boş bırakılamaz.');
      return;
    }
    if (nextDayOrder > 20) {
      setError('Bu güne zaten 20 maç eklenmiş.');
      return;
    }

    setIsSubmitting(true);
    try {
      const kickoffAt = new Date(`${date}T${kickoffTime}:00`).toISOString();
      await onSubmit({
        date,
        dayOrder: nextDayOrder,
        homeTeam,
        awayTeam,
        homeTeamLogo: homeTeamLogo.trim() || undefined,
        awayTeamLogo: awayTeamLogo.trim() || undefined,
        league,
        kickoffAt,
      });
      setHomeTeam('');
      setAwayTeam('');
      setHomeTeamLogo('');
      setAwayTeamLogo('');
    } catch {
      setError('Maç eklenirken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-3 rounded-xl border border-pitch-700/15 bg-white p-4
        dark:border-pitch-700 dark:bg-pitch-800 sm:grid-cols-2"
    >
      <div className="sm:col-span-2 font-mono text-xs text-pitch-700/60 dark:text-pitch-100/50">
        Eklenecek maç sırası: <strong>{nextDayOrder} / 20</strong>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Tarih
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-pitch-700/20 bg-transparent px-3 py-2 dark:border-pitch-700"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Başlama Saati
        <input
          type="time"
          value={kickoffTime}
          onChange={(e) => setKickoffTime(e.target.value)}
          className="rounded-md border border-pitch-700/20 bg-transparent px-3 py-2 dark:border-pitch-700"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Ev Sahibi Takım
        <input
          value={homeTeam}
          onChange={(e) => setHomeTeam(e.target.value)}
          placeholder="Ör. Galatasaray"
          className="rounded-md border border-pitch-700/20 bg-transparent px-3 py-2 dark:border-pitch-700"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Deplasman Takımı
        <input
          value={awayTeam}
          onChange={(e) => setAwayTeam(e.target.value)}
          placeholder="Ör. Fenerbahçe"
          className="rounded-md border border-pitch-700/20 bg-transparent px-3 py-2 dark:border-pitch-700"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Ev Sahibi Logo Linki (opsiyonel)
        <input
          value={homeTeamLogo}
          onChange={(e) => setHomeTeamLogo(e.target.value)}
          placeholder="https://..."
          className="rounded-md border border-pitch-700/20 bg-transparent px-3 py-2 font-mono text-xs dark:border-pitch-700"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Deplasman Logo Linki (opsiyonel)
        <input
          value={awayTeamLogo}
          onChange={(e) => setAwayTeamLogo(e.target.value)}
          placeholder="https://..."
          className="rounded-md border border-pitch-700/20 bg-transparent px-3 py-2 font-mono text-xs dark:border-pitch-700"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        Lig (opsiyonel)
        <input
          value={league}
          onChange={(e) => setLeague(e.target.value)}
          placeholder="Ör. Süper Lig"
          className="rounded-md border border-pitch-700/20 bg-transparent px-3 py-2 dark:border-pitch-700"
        />
      </label>

      {error && <p className="sm:col-span-2 text-sm text-pick-wrong">{error}</p>}

      <Button type="submit" isLoading={isSubmitting} className="sm:col-span-2">
        Maçı Ekle
      </Button>
    </form>
  );
}
