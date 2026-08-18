import { useState } from 'react';
import { Download, Check } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { createMatch, getTeamLogoByName } from '@/services/matchService';

interface FetchedMatch {
  mackolikId: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  league: string;
  state: string;
}

interface AdminFetchMatchesProps {
  date: string;
  nextDayOrder: number;
  onAdded: () => void;
}

/**
 * Admin panelinde "Maçları Çek" butonu - mackolik.com'dan (sunucu tarafı
 * /api/fetch-matches üzerinden) seçilen günün Süper Lig / Premier Lig /
 * LaLiga / Serie A / Ligue 1 maçlarını çeker, bir önizleme listesi gösterir
 * (checkbox'larla, istemediğin maçı çıkarabilirsin), ve "Seçilenleri Ekle"
 * ile hepsini tek seferde (mevcut createMatch akışını kullanarak, takım
 * logolarını da otomatik bularak) kaydeder.
 */
export function AdminFetchMatches({ date, nextDayOrder, onAdded }: AdminFetchMatchesProps) {
  const [fetchedMatches, setFetchedMatches] = useState<FetchedMatch[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [fetching, setFetching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFetch() {
    setFetching(true);
    setError(null);
    setFetchedMatches([]);
    try {
      const res = await fetch(`/api/fetch-matches?date=${date}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Maçlar çekilemedi.');
      const matches: FetchedMatch[] = json.matches ?? [];
      setFetchedMatches(matches);
      setSelectedIds(new Set(matches.map((m) => m.mackolikId))); // Varsayılan: hepsi seçili
      if (matches.length === 0) {
        setError('Bu tarih için 5 ligimizden (Süper Lig, Premier Lig, LaLiga, Serie A, Ligue 1) hiç maç bulunamadı.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Maçlar çekilemedi.');
    } finally {
      setFetching(false);
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAddSelected() {
    const toAdd = fetchedMatches.filter((m) => selectedIds.has(m.mackolikId));
    if (toAdd.length === 0) return;
    if (nextDayOrder - 1 + toAdd.length > 20) {
      setError(`Bu kadar maç eklenirse günlük 20 maç sınırı aşılır (şu an ${nextDayOrder - 1}, +${toAdd.length}).`);
      return;
    }

    setAdding(true);
    setError(null);
    try {
      let dayOrder = nextDayOrder;
      for (const m of toAdd) {
        const [homeTeamLogo, awayTeamLogo] = await Promise.all([
          getTeamLogoByName(m.homeTeam).catch(() => undefined),
          getTeamLogoByName(m.awayTeam).catch(() => undefined),
        ]);
        await createMatch({
          date,
          dayOrder,
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          homeTeamLogo: homeTeamLogo ?? undefined,
          awayTeamLogo: awayTeamLogo ?? undefined,
          league: m.league,
          kickoffAt: m.kickoffAt,
        });
        dayOrder += 1;
      }
      setFetchedMatches([]);
      setSelectedIds(new Set());
      onAdded();
    } catch {
      setError('Maçlar eklenirken bir hata oluştu.');
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="rounded-xl border border-pitch-700/15 bg-white p-4 dark:border-pitch-700 dark:bg-pitch-800">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-sm font-semibold text-pitch-900 dark:text-pitch-100">
            Maçları Otomatik Çek
          </h3>
          <p className="font-mono text-[10px] text-pitch-700/50 dark:text-pitch-100/40">
            Süper Lig · Premier Lig · LaLiga · Serie A · Ligue 1
          </p>
        </div>
        <Button onClick={handleFetch} isLoading={fetching} variant="secondary" className="!px-3 !py-1.5 text-xs">
          <Download size={14} className="mr-1 inline" />
          Maçları Çek
        </Button>
      </div>

      {error && <p className="mb-3 font-mono text-xs text-pick-wrong">{error}</p>}

      {fetchedMatches.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            {fetchedMatches.map((m) => {
              const selected = selectedIds.has(m.mackolikId);
              const time = new Date(m.kickoffAt).toLocaleTimeString('tr-TR', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Europe/Istanbul',
              });
              return (
                <button
                  key={m.mackolikId}
                  type="button"
                  onClick={() => toggleSelected(m.mackolikId)}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${
                    selected
                      ? 'border-scoreboard-amber bg-scoreboard-amber/10'
                      : 'border-pitch-700/15 opacity-50 hover:opacity-100 dark:border-pitch-700'
                  }`}
                >
                  <span className="flex flex-col">
                    <span className="text-pitch-900 dark:text-pitch-100">
                      {m.homeTeam} - {m.awayTeam}
                    </span>
                    <span className="font-mono text-[10px] text-pitch-700/50 dark:text-pitch-100/40">
                      {m.league} · {time}
                    </span>
                  </span>
                  {selected && <Check size={16} className="text-scoreboard-amber" />}
                </button>
              );
            })}
          </div>

          <Button onClick={handleAddSelected} isLoading={adding} className="text-sm">
            Seçilenleri Ekle ({selectedIds.size})
          </Button>
        </div>
      )}
    </div>
  );
}
