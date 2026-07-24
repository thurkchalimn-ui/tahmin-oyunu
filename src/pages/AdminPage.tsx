import { useState } from 'react';
import { useMatches } from '@/hooks/useMatches';
import { createMatch, setMatchResult, undoMatchResult, updateMatch } from '@/services/matchService';
import { AdminMatchForm } from '@/components/admin/AdminMatchForm';
import { AdminMatchList } from '@/components/admin/AdminMatchList';
import { AdminAvatarOptions } from '@/components/admin/AdminAvatarOptions';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { todayKey } from '@/utils/dateUtils';

/** Admin paneli: seçilen güne maç ekleme ve sonuç girme işlemleri burada yapılır. */
export function AdminPage() {
  const [date, setDate] = useState(todayKey());
  const { data: matches, loading, error } = useMatches(date);
  const [actionError, setActionError] = useState<string | null>(null);

  const nextDayOrder = (matches?.length ?? 0) + 1;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
      <h1 className="font-display text-xl font-semibold text-pitch-900 dark:text-pitch-100">
        Admin Paneli
      </h1>

      <label className="flex max-w-xs flex-col gap-1 text-sm text-pitch-900 dark:text-pitch-100">
        Yönetilecek Tarih
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-pitch-700/20 bg-transparent px-3 py-2 dark:border-pitch-700"
        />
      </label>

      {actionError && <ErrorMessage message={actionError} />}

      <section>
        <h2 className="mb-2 font-display text-sm font-semibold text-pitch-900 dark:text-pitch-100">
          Maç Ekle
        </h2>
        <AdminMatchForm
          nextDayOrder={nextDayOrder}
          onSubmit={async (input) => {
            try {
              await createMatch(input);
            } catch {
              setActionError('Maç eklenemedi.');
            }
          }}
        />
      </section>

      <section>
        <h2 className="mb-2 font-display text-sm font-semibold text-pitch-900 dark:text-pitch-100">
          Sonuç Gir ({date})
        </h2>
        {loading ? (
          <LoadingSpinner label="Maçlar yükleniyor..." />
        ) : error ? (
          <ErrorMessage message={error} />
        ) : (
          <AdminMatchList
            matches={matches ?? []}
            onSetResult={async (matchId, result) => {
              try {
                await setMatchResult(matchId, result);
              } catch {
                setActionError('Sonuç kaydedilemedi.');
              }
            }}
            onUndoResult={async (matchId) => {
              try {
                await undoMatchResult(matchId);
              } catch {
                setActionError('Sonuç geri alınamadı.');
              }
            }}
            onUpdateMatch={async (matchId, updates) => {
              try {
                await updateMatch(matchId, updates);
              } catch {
                setActionError('Maç güncellenemedi.');
              }
            }}
          />
        )}
      </section>

      <section>
        <h2 className="mb-2 font-display text-sm font-semibold text-pitch-900 dark:text-pitch-100">
          Avatar Seçenekleri (Kullanıcıların Seçebileceği Logolar)
        </h2>
        <AdminAvatarOptions />
      </section>
    </div>
  );
}
