import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePredictionHistory } from '@/hooks/usePredictionHistory';
import { updateDisplayName, updateAvatarUrl } from '@/services/userService';
import { markProfileSeen } from '@/services/readStatusService';
import { enablePushNotifications, type PushPermissionResult } from '@/services/notificationService';
import { StreakBadge } from '@/components/leaderboard/StreakBadge';
import { PredictionHistoryList } from '@/components/leaderboard/PredictionHistoryList';
import { Avatar } from '@/components/common/Avatar';
import { useAvatarOptions } from '@/hooks/useAvatarOptions';
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

  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [pushStatus, setPushStatus] = useState<PushPermissionResult | 'idle' | 'requesting'>('idle');
  const { data: avatarOptions, loading: avatarOptionsLoading, error: avatarOptionsError } = useAvatarOptions();

  // Sayfa açılınca profili "görüldü" olarak işaretle - BottomNav'daki kırmızı nokta kaybolur.
  useEffect(() => {
    if (firebaseUser) markProfileSeen(firebaseUser.uid).catch(() => {});
  }, [firebaseUser]);

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
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Güncelleme başarısız oldu.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePickAvatar(logoUrl: string) {
    setAvatarError(null);
    setIsSavingAvatar(true);
    try {
      await updateAvatarUrl(firebaseUser!.uid, logoUrl);
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Görsel kaydedilemedi.');
    } finally {
      setIsSavingAvatar(false);
    }
  }

  async function handleEnablePush() {
    setPushStatus('requesting');
    const result = await enablePushNotifications(firebaseUser!.uid);
    setPushStatus(result);
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-6">
      <div className="flex items-center gap-3">
        <Avatar avatarUrl={profile.avatarUrl} size="lg" />
        <div>
          <h1 className="font-display text-xl font-semibold text-pitch-900 dark:text-pitch-100">Profilim</h1>
          <p className="mt-0.5 font-body text-sm text-pitch-700/60 dark:text-pitch-100/50">
            {profile.displayName}
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-pitch-700/15 bg-white p-5 dark:border-pitch-700 dark:bg-pitch-800">
        <p className="mb-2 font-mono text-xs uppercase tracking-wide text-pitch-700/60 dark:text-pitch-100/50">
          Güncel Serin
        </p>
        <StreakBadge currentStreak={profile.currentStreak} />
        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-pitch-700/10 pt-4 text-center dark:border-pitch-100/10">
          <div>
            <p className="font-mono text-lg font-bold text-scoreboard-amber">{profile.bestStreak}</p>
            <p className="font-mono text-[10px] uppercase text-pitch-700/60 dark:text-pitch-100/50">
              En İyi Seri
            </p>
          </div>
          <div>
            <p className="font-mono text-lg font-bold text-pitch-900 dark:text-pitch-100">
              {profile.correctPredictions}
            </p>
            <p className="font-mono text-[10px] uppercase text-pitch-700/60 dark:text-pitch-100/50">Doğru</p>
          </div>
          <div>
            <p className="font-mono text-lg font-bold text-pitch-900 dark:text-pitch-100">
              {profile.totalPredictions}
            </p>
            <p className="font-mono text-[10px] uppercase text-pitch-700/60 dark:text-pitch-100/50">Toplam</p>
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

      <section className="rounded-xl border border-pitch-700/15 bg-white p-4 dark:border-pitch-700 dark:bg-pitch-800">
        <h2 className="mb-1 font-display text-sm font-semibold text-pitch-900 dark:text-pitch-100">
          🔔 Push Bildirimleri
        </h2>
        <p className="mb-3 font-body text-xs text-pitch-700/60 dark:text-pitch-100/50">
          Tahmin ettiğin maçlar başlamadan 30 dakika önce ve sonuçlandığında telefonuna/tarayıcına
          bildirim gönderelim.
        </p>
        {pushStatus === 'granted' ? (
          <p className="font-mono text-xs text-pick-correct">✓ Bildirimler açık.</p>
        ) : pushStatus === 'denied' ? (
          <p className="font-mono text-xs text-pick-wrong">
            İzin verilmedi. Tarayıcı ayarlarından bu site için bildirim iznini açman gerekiyor.
          </p>
        ) : pushStatus === 'unsupported' ? (
          <p className="font-mono text-xs text-pitch-700/50 dark:text-pitch-100/40">
            Bu tarayıcı/cihaz push bildirimlerini desteklemiyor.
          </p>
        ) : pushStatus === 'error' ? (
          <p className="font-mono text-xs text-pick-wrong">
            Bir sorun oluştu, tekrar dener misin?
          </p>
        ) : (
          <Button onClick={handleEnablePush} isLoading={pushStatus === 'requesting'} className="text-xs">
            Bildirimleri Aç
          </Button>
        )}
      </section>

      <section className="rounded-xl border border-pitch-700/15 bg-white p-4 dark:border-pitch-700 dark:bg-pitch-800">
        <h2 className="mb-1 font-display text-sm font-semibold text-pitch-900 dark:text-pitch-100">
          Profil Görseli
        </h2>
        <p className="mb-3 font-body text-xs text-pitch-700/60 dark:text-pitch-100/50">
          Aşağıdaki listeden bir logo seç.
        </p>

        {avatarOptionsLoading ? (
          <LoadingSpinner label="Seçenekler yükleniyor..." />
        ) : avatarOptionsError ? (
          <ErrorMessage message={avatarOptionsError} />
        ) : !avatarOptions || avatarOptions.length === 0 ? (
          <p className="font-mono text-xs text-pitch-700/50 dark:text-pitch-100/40">
            Henüz seçilebilecek bir avatar eklenmedi.
          </p>
        ) : (
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
            {avatarOptions.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => handlePickAvatar(opt.logoUrl)}
                disabled={isSavingAvatar}
                title={opt.label}
                aria-label={`${opt.label} logosunu seç`}
                className={`rounded-full transition disabled:opacity-50 ${
                  profile.avatarUrl === opt.logoUrl
                    ? 'ring-2 ring-scoreboard-amber ring-offset-2 ring-offset-white dark:ring-offset-pitch-800'
                    : 'hover:opacity-80'
                }`}
              >
                <Avatar avatarUrl={opt.logoUrl} size="md" />
              </button>
            ))}
          </div>
        )}
        {avatarError && <p className="mt-2 text-sm text-pick-wrong">{avatarError}</p>}
      </section>

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
