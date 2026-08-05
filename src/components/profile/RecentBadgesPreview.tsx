import { Link } from 'react-router-dom';
import type { UserProfile } from '@/types';
import { getBadgeCategories, getBadgeCompletionStats } from '@/utils/badgeCatalog';

interface RecentBadgesPreviewProps {
  profile: UserProfile;
  /** Kendi profilinde /rozetler'e, başkasının profilinde farklı bir hedefe gitmek için. */
  viewAllHref?: string;
}

const SHIELD_CLIP_PATH = 'polygon(50% 0%, 100% 15%, 100% 55%, 50% 100%, 0% 55%, 0% 15%)';

/**
 * Profildeki kompakt "Son Alınan Rozetler" önizlemesi - tam katalog artık
 * burada değil, ayrı bir sayfada (bkz. BadgesPage.tsx). Burada sadece en son
 * kazanılan birkaç rozet + "Tümü" linki gösterilir.
 */
export function RecentBadgesPreview({ profile, viewAllHref = '/rozetler' }: RecentBadgesPreviewProps) {
  const categories = getBadgeCategories();
  const { earned, total } = getBadgeCompletionStats(profile);

  // Tüm katalogdaki KAZANILMIŞ öğeleri, kullanıcının badges dizisindeki
  // achievedAt sırasına göre (en son kazanılan en önce) bul.
  const earnedItems = categories
    .flatMap((cat) => cat.items.filter((item) => item.isUnlocked(profile)))
    .slice(-6)
    .reverse();

  return (
    <section className="rounded-xl border border-pitch-700/15 bg-gradient-to-b from-white to-pitch-100 p-4 shadow-stadium dark:border-pitch-700 dark:from-pitch-800 dark:to-pitch-900">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-display text-sm font-semibold text-pitch-900 dark:text-pitch-100">
            Son Alınan Rozetler
          </h2>
          <p className="font-mono text-[10px] text-pitch-700/50 dark:text-pitch-100/40">
            {earned} / {total} kazanıldı
          </p>
        </div>
        <Link to={viewAllHref} className="font-mono text-xs text-scoreboard-amber hover:underline">
          Tümü →
        </Link>
      </div>

      {earnedItems.length === 0 ? (
        <p className="font-body text-xs text-pitch-700/50 dark:text-pitch-100/40">
          Henüz rozet kazanılmadı - ilk tahminini yap!
        </p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {earnedItems.map((item) => (
            <div key={item.id} className="flex shrink-0 flex-col items-center gap-1.5">
              <div
                style={{ clipPath: SHIELD_CLIP_PATH }}
                className="relative flex h-14 w-14 flex-col items-center justify-center gap-0.5
                  bg-gradient-to-b from-scoreboard-amber/25 via-scoreboard-amber/10 to-transparent
                  text-scoreboard-amber shadow-glow"
              >
                {item.numberLabel ? (
                  <>
                    {item.topIcon}
                    <span className="font-mono text-base font-bold leading-none">{item.numberLabel}</span>
                  </>
                ) : (
                  item.icon
                )}
              </div>
              <p className="max-w-[64px] text-center font-mono text-[9px] leading-tight text-pitch-900 dark:text-pitch-100">
                {item.subLabel}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
