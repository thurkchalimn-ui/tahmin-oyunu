import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePredictionHistory } from '@/hooks/usePredictionHistory';
import {
  updateDisplayName,
  updateAvatarUrl,
  updateNotificationPreferences,
  ACTIVITY_STREAK_MILESTONES,
} from '@/services/userService';
import { deleteAccount } from '@/services/authService';
import { markProfileSeen } from '@/services/readStatusService';
import { enablePushNotifications, type PushPermissionResult } from '@/services/notificationService';
import { StreakBadge } from '@/components/leaderboard/StreakBadge';
import { PredictionHistoryList } from '@/components/leaderboard/PredictionHistoryList';
import { PeriodTabs } from '@/components/leaderboard/PeriodTabs';
import { Avatar } from '@/components/common/Avatar';
import { FollowLists } from '@/components/common/FollowLists';
import { BADGE_ICONS, BADGE_LABELS } from '@/components/common/BadgeIcons';
import { useAvatarOptions } from '@/hooks/useAvatarOptions';
import { Button } from '@/components/common/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { isNonEmpty } from '@/utils/validators';
import { getPeriodRange, type StatsPeriod } from '@/utils/periodUtils';

/** Kullanıcının kendi istatistiklerini ve rozetlerini gördüğü profil sayfası. */
export function ProfilePage() {
  const navigate = useNavigate();
  const { firebaseUser, profile } = useAuth();
  const { data: history, loading: historyLoading, error: historyError } = usePredictionHistory(
    firebaseUser?.uid,
  );
  const [tab, setTab] = useState<StatsPeriod>('all');
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [pushStatus, setPushStatus] = useState<PushPermissionResult | 'idle' | 'requesting'>('idle');
  const { data: avatarOptions, loading: avatarOptionsLoading, error: avatarOptionsError } = useAvatarOptions();

  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Sayfa açılınca profili "görüldü" olarak işaretle - BottomNav'daki kırmızı nokta kaybolur.
  useEffect(() => {
    if (firebaseUser) markProfileSeen(firebaseUser.uid).catch(() => {});
  }, [firebaseUser]);

  // Seçilen döneme (hafta/ay/genel) göre tahmin geçmişini filtrele. 'all' için
  // filtre uygulanmaz. Filtreleme, zaten çekilmiş olan `history` listesi
  // üzerinde istemci tarafında yapılır - ekstra bir Firestore sorgusu gerekmez.
  const filteredHistory = useMemo(() => {
    if (!history) return null;
    const range = getPeriodRange(tab);
    if (!range) return history;
    return history.filter((item) => item.match.date >= range.start && item.match.date < range.end);
  }, [history, tab]);

  const periodStats = useMemo(() => {
    if (!filteredHistory) return { total: 0, correct: 0 };
    const resolved = filteredHistory.filter((item) => item.prediction.isCorrect !== null);
    return {
      total: resolved.length,
      correct: resolved.filter((item) => item.prediction.isCorrect === true).length,
    };
  }, [filteredHistory]);

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

  async function handleTogglePreference(key: 'notifyOnResult' | 'notifyOnReminder', value: boolean) {
    await updateNotificationPreferences(firebaseUser!.uid, { [key]: value });
  }

  async function handleDeleteAccount(e: FormEvent) {
    e.preventDefault();
    setDeleteError(null);
    if (!isNonEmpty(deletePassword)) {
      setDeleteError('Şifreni girmen gerekiyor.');
      return;
    }
    const confirmed = window.confirm(
      'Hesabını kalıcı olarak silmek istediğine emin misin? Bu işlem geri alınamaz.',
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await deleteAccount(deletePassword);
      navigate('/');
    } catch (err) {
      setDeleteError(
        err instanceof Error && 'code' in err && (err as { code: string }).code === 'auth/invalid-credential'
          ? 'Şifre hatalı.'
          : 'Hesap silinemedi. Şifreni kontrol edip tekrar dene.',
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-6">
      <div className="flex items-center gap-3">
        <Avatar avatarUrl={profile.avatarUrl} size="lg" />
        <h1 className="font-display text-xl font-semibold text-pitch-900 dark:text-pitch-100">
          {profile.displayName}
        </h1>
      </div>

      <FollowLists uid={firebaseUser.uid} />

      <div>
        <PeriodTabs value={tab} onChange={setTab} />
      </div>

      <section className="rounded-xl border border-pitch-700/15 bg-white p-5 dark:border-pitch-700 dark:bg-pitch-800">
        <p className="mb-2 font-mono text-xs uppercase tracking-wide text-pitch-700/60 dark:text-pitch-100/50">
          Güncel Serin
        </p>
        <StreakBadge currentStreak={profile.currentStreak} />
        {tab === 'all' ? (
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
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-pitch-700/10 pt-4 text-center dark:border-pitch-100/10">
            <div>
              <p className="font-mono text-lg font-bold text-pitch-900 dark:text-pitch-100">
                {periodStats.correct}
              </p>
              <p className="font-mono text-[10px] uppercase text-pitch-700/60 dark:text-pitch-100/50">
                Doğru ({tab === 'week' ? 'Bu Hafta' : 'Bu Ay'})
              </p>
            </div>
            <div>
              <p className="font-mono text-lg font-bold text-pitch-900 dark:text-pitch-100">
                {periodStats.total}
              </p>
              <p className="font-mono text-[10px] uppercase text-pitch-700/60 dark:text-pitch-100/50">
                Toplam ({tab === 'week' ? 'Bu Hafta' : 'Bu Ay'})
              </p>
            </div>
          </div>
        )}
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
                {BADGE_ICONS[badge.type]} {BADGE_LABELS[badge.type](badge.value)}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-pitch-700/15 bg-white p-4 dark:border-pitch-700 dark:bg-pitch-800">
        <h2 className="mb-1 font-display text-sm font-semibold text-pitch-900 dark:text-pitch-100">
          🔥 Günlük Giriş Serin
        </h2>
        {(() => {
          const streak = profile.activityStreak ?? 0;
          const nextMilestone = ACTIVITY_STREAK_MILESTONES.find((m) => m > streak);
          const prevMilestone = [...ACTIVITY_STREAK_MILESTONES].reverse().find((m) => m <= streak) ?? 0;
          const target = nextMilestone ?? streak;
          const rangeStart = prevMilestone;
          const progress =
            nextMilestone && nextMilestone > rangeStart
              ? Math.min(100, Math.round(((streak - rangeStart) / (nextMilestone - rangeStart)) * 100))
              : 100;
          return (
            <>
              <p className="mb-2 font-body text-xs text-pitch-700/60 dark:text-pitch-100/50">
                {streak} gün üst üste giriş yaptın.{' '}
                {nextMilestone
                  ? `${nextMilestone} güne ulaşınca yeni bir rozet kazanacaksın (${nextMilestone - streak} gün kaldı).`
                  : 'Tüm giriş serisi rozetlerini kazandın! 🎉'}
              </p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-pitch-700/10 dark:bg-pitch-700">
                <div
                  className="h-full rounded-full bg-scoreboard-amber transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1 text-right font-mono text-[10px] text-pitch-700/50 dark:text-pitch-100/40">
                {streak} / {target} gün
              </p>
            </>
          );
        })()}
      </section>

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

        <div className="mt-4 flex flex-col gap-2 border-t border-pitch-700/10 pt-4 dark:border-pitch-100/10">
          <label className="flex items-center justify-between gap-3 text-sm text-pitch-900 dark:text-pitch-100">
            <span>Maç sonucu bildirimleri</span>
            <input
              type="checkbox"
              checked={profile.notifyOnResult ?? true}
              onChange={(e) => handleTogglePreference('notifyOnResult', e.target.checked)}
              className="h-4 w-4 accent-scoreboard-amber"
            />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm text-pitch-900 dark:text-pitch-100">
            <span>Maç başlamadan 30 dk kala hatırlatma</span>
            <input
              type="checkbox"
              checked={profile.notifyOnReminder ?? true}
              onChange={(e) => handleTogglePreference('notifyOnReminder', e.target.checked)}
              className="h-4 w-4 accent-scoreboard-amber"
            />
          </label>
        </div>
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
          Tahmin Geçmişim {tab !== 'all' && `(${tab === 'week' ? 'Bu Hafta' : 'Bu Ay'})`}
        </h2>
        {historyLoading ? (
          <LoadingSpinner label="Tahminler yükleniyor..." />
        ) : historyError ? (
          <ErrorMessage message={historyError} />
        ) : (
          <PredictionHistoryList items={filteredHistory ?? []} />
        )}
      </section>

      <p className="text-center font-mono text-xs">
        <Link to="/gizlilik" className="text-pitch-700/50 hover:underline dark:text-pitch-100/40">
          Gizlilik Politikası ve Kullanım Şartları
        </Link>
      </p>

      <section className="rounded-xl border border-pick-wrong/30 bg-pick-wrong/5 p-4">
        <h2 className="mb-1 font-display text-sm font-semibold text-pick-wrong">Tehlikeli Bölge</h2>
        <p className="mb-3 font-body text-xs text-pitch-700/60 dark:text-pitch-100/50">
          Hesabını sildiğinde profilin, tahminlerin ve kullanıcı adın kalıcı olarak kaldırılır. Bu
          işlem geri alınamaz.
        </p>
        {!showDeleteForm ? (
          <Button variant="danger" onClick={() => setShowDeleteForm(true)} className="text-xs">
            Hesabımı Sil
          </Button>
        ) : (
          <form onSubmit={handleDeleteAccount} className="flex flex-col gap-2">
            <label className="flex flex-col gap-1 text-xs text-pitch-900 dark:text-pitch-100">
              Onaylamak için şifreni gir
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="rounded-md border border-pick-wrong/30 bg-transparent px-3 py-2 text-sm"
              />
            </label>
            {deleteError && <p className="text-xs text-pick-wrong">{deleteError}</p>}
            <div className="flex gap-2">
              <Button type="submit" variant="danger" isLoading={isDeleting} className="text-xs">
                Kalıcı Olarak Sil
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowDeleteForm(false);
                  setDeletePassword('');
                  setDeleteError(null);
                }}
                className="text-xs"
              >
                Vazgeç
              </Button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
