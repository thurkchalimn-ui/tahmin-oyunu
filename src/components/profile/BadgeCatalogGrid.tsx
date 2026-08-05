import { Lock } from 'lucide-react';
import type { UserProfile } from '@/types';
import { getBadgeCategories, getBadgeCompletionStats } from '@/utils/badgeCatalog';

interface BadgeCatalogGridProps {
  profile: UserProfile;
}

// Klasik kalkan silüeti - görseldeki rozetlerle aynı form
const SHIELD_CLIP_PATH = 'polygon(50% 0%, 100% 15%, 100% 55%, 50% 100%, 0% 55%, 0% 15%)';

/**
 * Profildeki tam "Rozetler" kataloğu - mockup'takiyle aynı düzen: üstte
 * toplam rozet/tamamlama oranı, altında kategori kategori (Seri/Devamlılık/
 * Tahmin/Başarı) kalkan ızgarası, kilitli olanlar soluk+kilit ikonlu.
 */
export function BadgeCatalogGrid({ profile }: BadgeCatalogGridProps) {
  const categories = getBadgeCategories();
  const { earned, total } = getBadgeCompletionStats(profile);
  const completionPct = total > 0 ? Math.round((earned / total) * 100) : 0;

  return (
    <section className="flex flex-col gap-4">
      {/* Üst özet kartı */}
      <div className="rounded-xl border border-pitch-700/15 bg-gradient-to-b from-white to-pitch-100 p-4 shadow-stadium dark:border-pitch-700 dark:from-pitch-800 dark:to-pitch-900">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wide text-pitch-700/60 dark:text-pitch-100/50">
              Toplam Rozet
            </p>
            <p className="font-mono text-xl font-bold text-pitch-900 dark:text-pitch-100">
              {earned} <span className="text-sm font-normal text-pitch-700/50 dark:text-pitch-100/40">/ {total}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase tracking-wide text-pitch-700/60 dark:text-pitch-100/50">
              Tamamlama Oranı
            </p>
            <p className="font-mono text-xl font-bold text-scoreboard-amber">{completionPct}%</p>
          </div>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-pitch-700/10 dark:bg-pitch-700">
          <div
            className="h-full rounded-full bg-scoreboard-amber shadow-glow transition-all duration-300"
            style={{ width: `${completionPct}%` }}
          />
        </div>
      </div>

      {/* Kategoriler */}
      {categories.map((category) => {
        const categoryEarned = category.items.filter((i) => i.isUnlocked(profile)).length;
        return (
          <div
            key={category.key}
            className="rounded-xl border border-pitch-700/15 bg-gradient-to-b from-white to-pitch-100 p-4 shadow-stadium dark:border-pitch-700 dark:from-pitch-800 dark:to-pitch-900"
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <h3 className="font-display text-sm font-semibold text-pitch-900 dark:text-pitch-100">
                  {category.title}
                </h3>
                <p className="font-body text-xs text-pitch-700/60 dark:text-pitch-100/50">
                  {category.description}
                </p>
              </div>
              <span className="shrink-0 font-mono text-xs font-bold text-scoreboard-amber">
                {categoryEarned} / {category.items.length}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-3 sm:grid-cols-7">
              {category.items.map((item) => {
                const unlocked = item.isUnlocked(profile);
                return (
                  <div key={item.id} className="flex flex-col items-center gap-1.5">
                    <div
                      style={{ clipPath: SHIELD_CLIP_PATH }}
                      className={`relative flex h-14 w-14 flex-col items-center justify-center gap-0.5 border-2 ${
                        unlocked
                          ? 'border-scoreboard-amber bg-gradient-to-b from-scoreboard-amber/25 via-scoreboard-amber/10 to-transparent text-scoreboard-amber shadow-glow'
                          : 'border-pitch-700/20 bg-pitch-700/10 text-pitch-700/30 dark:border-pitch-700/60 dark:bg-pitch-700/30 dark:text-pitch-100/20'
                      }`}
                    >
                      {unlocked ? (
                        item.numberLabel ? (
                          <>
                            {item.topIcon}
                            <span className="font-mono text-base font-bold leading-none">{item.numberLabel}</span>
                          </>
                        ) : (
                          item.icon
                        )
                      ) : (
                        <Lock size={16} />
                      )}
                    </div>
                    <p
                      className={`text-center font-mono text-[9px] leading-tight ${
                        unlocked
                          ? 'text-pitch-900 dark:text-pitch-100'
                          : 'text-pitch-700/40 dark:text-pitch-100/30'
                      }`}
                    >
                      {item.subLabel}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
