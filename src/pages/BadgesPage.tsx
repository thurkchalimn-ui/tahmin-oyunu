import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { BadgeCatalogGrid } from '@/components/profile/BadgeCatalogGrid';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { usePageTitle } from '@/hooks/usePageTitle';

/**
 * Profildeki "Tümü" linkinin gittiği, tam rozet kataloğunu (kilitli dahil)
 * gösteren sayfa. İki rotadan erişilebilir:
 *  - /rozetler → kendi profilin (useAuth'taki profile)
 *  - /oyuncu/:uid/rozetler → başka bir oyuncunun profili (usePlayerProfile)
 */
export function BadgesPage() {
  const { uid } = useParams<{ uid?: string }>();
  const { profile: ownProfile } = useAuth();
  const { data: playerProfile, loading, error } = usePlayerProfile(uid);

  const profile = uid ? playerProfile : ownProfile;
  usePageTitle(uid && profile ? `${profile.displayName} - Rozetler` : 'Rozetlerim');
  const backHref = uid ? `/oyuncu/${uid}` : '/profil';

  if (uid && loading) return <LoadingSpinner fullScreen label="Yükleniyor..." />;
  if (uid && (error || !profile)) return <ErrorMessage message={error ?? 'Oyuncu bulunamadı.'} />;
  if (!profile) return <LoadingSpinner fullScreen label="Yükleniyor..." />;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-6">
      <Link
        to={backHref}
        className="inline-flex w-fit items-center gap-1 font-mono text-xs text-scoreboard-amber hover:underline"
      >
        <ArrowLeft size={14} />
        Profile dön
      </Link>

      <div>
        <h1 className="font-display text-xl font-semibold text-pitch-900 dark:text-pitch-100">
          {uid ? `${profile.displayName} - Rozetler` : 'Rozetler'}
        </h1>
        <p className="font-body text-sm text-pitch-700/60 dark:text-pitch-100/50">
          Rozetlerini topla, serini büyüt ve özel başarıların kilidini aç.
        </p>
      </div>

      <BadgeCatalogGrid profile={profile} />
    </div>
  );
}
