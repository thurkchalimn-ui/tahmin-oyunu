import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Camera, BadgeCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePredictionHistory } from '@/hooks/usePredictionHistory';
import {
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
import { BADGE_ICONS, BADGE_LABELS } from '@/components/common/BadgeIcons';
import { ShareButton } from '@/components/common/ShareButton';
import { useAvatarOptions } from '@/hooks/useAvatarOptions';
import { useFollowCounts } from '@/hooks/useFollowCounts';
import { useUserRank } from '@/hooks/useUserRank';
import { ProfileStatGrid } from '@/components/profile/ProfileStatGrid';
import { PerformanceSummary } from '@/components/profile/PerformanceSummary';
import { RecentPredictionCards } from '@/components/profile/RecentPredictionCards';
import { Button } from '@/components/common/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { isNonEmpty } from '@/utils/validators';
import { getPeriodRange, type StatsPeriod } from '@/utils/periodUtils';

/** Kullanıcının kendi istatistiklerini ve rozetlerini gördüğü profil sayfası. */
export function ProfilePage() {
  const navigate = useNavigate();
  const { firebaseUser, profile, emailVerified } = useAuth();
  const { data: history, loading: historyLoading, error: historyError } = usePredictionHistory(
    firebaseUser?.uid,
  );
  const [tab, setTab] = useState<StatsPeriod>('all');
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const [pushStatus, setPushStatus] = useState<PushPermissionResult | 'idle' | 'requesting'>('idle');
  const { data: avatarOptions, loading: avatarOptionsLoading, error: avatarOptionsError } = useAvatarOptions();

  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { followerCount, followingCount } = useFollowCounts(firebaseUser?.uid);
  const rank = useUserRank(profile?.correctPredictions);

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

  async function handlePickAvatar(logoUrl: string) {
    setAvatarError(null);
    setIsSavingAvatar(true);
    try {
      await updateAvatarUrl(firebaseUser!.uid, logoUrl);
      setShowAvatarPicker(false);
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
    // ÖNEMLİ: Renk paleti DEĞİŞMEDİ - hâlâ pitch/scoreboard tonları. Kendi
    // arka plan rengimizi burada yeniden tanımlamıyoruz (App.tsx'in kök
    // sarmalayıcısındaki bg-pitch-100/dark:bg-pitch-900 zaten geçerli) -
    // sadece üzerine ışık efekti bindiriliyor. Gradyan, Tailwind'in özel
    // class'ı yerine garanti çalışan inline style ile uygulanıyor.
    <div className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[360px]"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 70% 45% at 20% -15%, rgba(242, 183, 5, 0.18), transparent 60%), ' +
            'radial-gradient(ellipse 60% 40% at 85% -10%, rgba(242, 183, 5, 0.12), transparent 65%)',
        }}
      />

      <div className="relative mx-auto flex max-w-xl flex-col gap-6 px-4 py-6">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0 rounded-full shadow-glow">
            <Avatar avatarUrl={profile.avatarUrl} size="xl" />
            <button
              type="button"
              onClick={() => setShowAvatarPicker((v) => !v)}
              title="Profil görselini değiştir"
              aria-expanded={showAvatarPicker}
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full
                border-2 border-white bg-pitch-950 text-scoreboard-amber shadow-glow dark:border-pitch-900"
            >
              <Camera size={14} />
            </button>
          </div>
          <div>
            <h1 className="flex items-center gap-1.5 font-display text-xl font-semibold text-pitch-900 dark:text-pitch-100">
              {profile.displayName}
              {emailVerified && (
                <span title="E-posta doğrulandı" className="text-scoreboard-amber">
                  <BadgeCheck size={18} />
                </span>
              )}
            </h1>
          </div>
        </div>

        {/* Kamera ikonuna tıklanınca açılan/kapanan avatar seçim paneli -
            artık sayfanın altında sabit bir bölüm değil, avatarın hemen
            altında beliren bir "bar". */}
        {showAvatarPicker && (
          <div className="rounded-xl border border-pitch-700/15 bg-gradient-to-b from-white to-pitch-100 p-4 shadow-stadium dark:border-pitch-700 dark:from-pitch-800 dark:to-pitch-900">
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
                        ? 'shadow-glow ring-2 ring-scoreboard-amber ring-offset-2 ring-offset-white dark:ring-offset-pitch-800'
                        : 'hover:opacity-80'
                    }`}
                  >
                    <Avatar avatarUrl={opt.logoUrl} size="md" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {avatarError && <p className="text-sm text-pick-wrong">{avatarError}</p>}

        <ProfileStatGrid followerCount={followerCount} followingCount={followingCount} rank={rank} />

        <PerformanceSummary
          correctPredictions={profile.correctPredictions}
          totalPredictions={profile.totalPredictions}
          bestStreak={profile.bestStreak}
          memberSince={profile.createdAt}
        />

        {/* Güncel seri - büyük, vurgulu bir "hero" kartı olarak */}
        <section className="rounded-xl border border-pitch-700/15 bg-gradient-to-b from-white to-pitch-100 p-5 shadow-stadium dark:border-pitch-700 dark:from-pitch-800 dark:to-pitch-900">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-mono text-xs uppercase tracking-wide text-pitch-700/60 dark:text-pitch-100/50">
              Güncel Serin
            </p>
            {profile.currentStreak > 0 && (
              <ShareButton
                icon="⚽"
                headline={`${profile.currentStreak} MAÇLIK SERİ SÜRÜYOR!`}
                subtext={profile.displayName}
              />
            )}
          </div>
          <StreakBadge currentStreak={profile.currentStreak} />
        </section>

        <RecentPredictionCards items={history ?? []} />

        <div>
          <PeriodTabs value={tab} onChange={setTab} />
        </div>

        {/* Genel sekmesinde "Doğru/Toplam" artık yukarıdaki ProfileStatGrid'de
            gösterildiği için burada tekrar edilmiyor - sadece En İyi Seri
            kalıyor. Haftalık/Aylık sekmelerde ise o döneme özel Doğru/Toplam
            hâlâ burada gösteriliyor (ProfileStatGrid her zaman tüm-zamanlar). */}
        {tab === 'all' ? (
          <div className="w-32">
            <StatTile icon="🔥" value={profile.bestStreak} label="En İyi Seri" highlight />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <StatTile icon="✅" value={periodStats.correct} label={`Doğru (${tab === 'week' ? 'Bu Hafta' : 'Bu Ay'})`} />
            <StatTile icon="📊" value={periodStats.total} label={`Toplam (${tab === 'week' ? 'Bu Hafta' : 'Bu Ay'})`} />
          </div>
        )}

        {profile.badges.length > 0 && (
          <section>
            <h2 className="mb-2 font-display text-sm font-semibold text-pitch-900 dark:text-pitch-100">
              Rozetler
            </h2>
            {/* Rozet "kalkan" kartları - mockup'taki ROZETLERİM ızgarasına benzer,
                amber kenarlık/parlama ile "kazanıldı" hissi veriyor */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {profile.badges.map((badge, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-2 rounded-xl border border-scoreboard-amber/40
                    bg-gradient-to-b from-scoreboard-amber/15 to-transparent p-3 text-center shadow-glow"
                >
                  <span className="text-3xl">{BADGE_ICONS[badge.type]}</span>
                  <span className="font-mono text-[11px] font-semibold text-scoreboard-amberDark dark:text-scoreboard-amber">
                    {BADGE_LABELS[badge.type](badge.value)}
                  </span>
                  <ShareButton
                    icon={BADGE_ICONS[badge.type]}
                    headline={BADGE_LABELS[badge.type](badge.value).toUpperCase() + '!'}
                    subtext={profile.displayName}
                    label="Paylaş"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-xl border border-pitch-700/15 bg-gradient-to-b from-white to-pitch-100 p-4 shadow-stadium dark:border-pitch-700 dark:from-pitch-800 dark:to-pitch-900">
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
                    className="h-full rounded-full bg-scoreboard-amber shadow-glow transition-all"
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

        <section className="rounded-xl border border-pitch-700/15 bg-gradient-to-b from-white to-pitch-100 p-4 shadow-stadium dark:border-pitch-700 dark:from-pitch-800 dark:to-pitch-900">
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
    </div>
  );
}

/** Mockup'taki "SERİ / EN İYİ SERİ / DOĞRULUK" gibi tekil istatistik kartlarını üreten yardımcı bileşen. */
function StatTile({
  icon,
  value,
  label,
  highlight = false,
}: {
  icon: string;
  value: number;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center shadow-stadium ${
        highlight
          ? 'border-scoreboard-amber/40 bg-gradient-to-b from-scoreboard-amber/15 to-transparent'
          : 'border-pitch-700/15 bg-gradient-to-b from-white to-pitch-100 dark:border-pitch-700 dark:from-pitch-800 dark:to-pitch-900'
      }`}
    >
      <span className="text-xl">{icon}</span>
      <p className="font-mono text-lg font-bold text-pitch-900 dark:text-pitch-100">{value}</p>
      <p className="font-mono text-[10px] uppercase leading-tight text-pitch-700/60 dark:text-pitch-100/50">
        {label}
      </p>
    </div>
  );
}
