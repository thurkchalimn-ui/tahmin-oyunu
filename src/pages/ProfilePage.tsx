import { useState, type FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePredictionHistory } from '@/hooks/usePredictionHistory';
import { updateDisplayName } from '@/services/userService';
import { StreakBadge } from '@/components/leaderboard/StreakBadge';
import { PredictionHistoryList } from '@/components/leaderboard/PredictionHistoryList';
import { Button } from '@/components/common/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { isNonEmpty } from '@/utils/validators';

/** Kullanıcının kendi istatistiklerini ve rozetlerini gördüğü profil sayfası. */
export function ProfilePage() {
  const { firebaseUser, profile } = useAuth();
  const { data: history, loading: historyLoading, error: historyError } = usePredictionHistory(
    firebaseUser?.uid,
  );
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (!firebaseUser || !profile) return <LoadingSpinner fullScreen label="Profil yükleniyor..." />;

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setSaved(false);
    if (!isNonEmpty(displayName)) {
      setSaveError('Kullanıcı adı boş olamaz.');
      return;
    }
    setIsSaving(true);
    try {
      await updateDisplayName(firebaseUser!.uid, displayName);
      setSaved(true);
    } catch {
      setSaveError('Güncelleme başarısız oldu.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-6">
      <h1 className="font-display text-xl font-semibold text-pitch-900 dark:text-pitch-100">Profilim</h1>

      <section className="rounded-xl bg-pitch-900 p-5 text-pitch-100 dark:bg-pitch-800">
        <p className="mb-2 font-mono text-xs uppercase tracking-wide text-pitch-100/50">Güncel Serin</p>
        <StreakBadge currentStreak={profile.currentStreak} />
        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-pitch-100/10 pt-4 text-center">
          <div>
            <p className="font-mono text-lg font-bold text-scoreboard-amber">{profile.bestStreak}</p>
            <p className="font-mono text-[10px] uppercase text-pitch-100/50">En İyi Seri</p>
          </div>
          <div>
            <p className="font-mono text-lg font-bold">{profile.correctPredictions}</p>
            <p className="font-mono text-[10px] uppercase text-pitch-100/50">Doğru</p>
          </div>
          <div>
            <p className="font-mono text-lg font-bold">{profile.totalPredictions}</p>
            <p className="font-mono text-[10px] uppercase text-pitch-100/50">Toplam</p>
          </div>
        </div>
      </section>

      {profile.badges.length > 0 && (
        <section>
          <h2 className="mb-2 font-display text-sm font-semibold text-pitch-900 dark:text-pitch-100">
            Rozetler
          </h2>
          <div className="flex flex-wrap gap-2">
            {profile.badges.map((badge, i) => (
              <span
                key={i}
                className="rounded-full bg-scoreboard-amber/15 px-3 py-1.5 font-mono text-xs text-scoreboard-amberDark dark:text-scoreboard-amber"
              >
                🏆 {badge.streakLength} maçlık seri
              </span>
            ))}
          </div>
        </section>
      )}

      <form onSubmit={handleSave} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-pitch-900 dark:text-pitch-100">
          Kullanıcı Adı
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="rounded-md border border-pitch-700/20 bg-transparent px-3 py-2 dark:border-pitch-700"
          />
        </label>
        {saveError && <p className="text-sm text-pick-wrong">{saveError}</p>}
        {saved && <p className="text-sm text-pick-correct">Kaydedildi.</p>}
        <Button type="submit" isLoading={isSaving} className="self-start">
          Kaydet
        </Button>
      </form>

      <section>
        <h2 className="mb-2 font-display text-sm font-semibold text-pitch-900 dark:text-pitch-100">
          Tahmin Geçmişim
        </h2>
        {historyLoading ? (
          <LoadingSpinner label="Tahminler yükleniyor..." />
        ) : historyError ? (
          <ErrorMessage message={historyError} />
        ) : (
          <PredictionHistoryList items={history ?? []} />
        )}
      </section>
    </div>
  );
}
