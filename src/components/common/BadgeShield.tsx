import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';

interface BadgeShieldProps {
  shape: 'shield' | 'tag';
  unlocked: boolean;
  numberLabel?: string;
  topIcon?: ReactNode;
  icon?: ReactNode;
}

// Klasik, düzgün kavisli kalkan silüeti (Seri/Tahmin/Başarı/Takipçi
// rozetleri için) - referans görseldeki kalkanlarla birebir aynı ruhta:
// yukarıda düz, aşağıya doğru yumuşak bir sivriliğe geçiyor. clip-path'in
// polygon() yerine path() sürümü kullanılıyor - bu, gerçek eğrilere izin
// veriyor (polygon sadece düz kenarlarla sınırlı kalırdı).
const SHIELD_CLIP_PATH =
  "path('M 28 2 L 48 9 L 50 10 L 50 30 Q 50 48 28 54 Q 6 48 6 30 L 6 10 Z')";

/**
 * Rozet gösterim şekli - iki varyant:
 *  - 'shield': klasik kalkan (Seri/Tahmin/Başarı/Takipçi rozetleri) -
 *    referans görseldeki gibi düzgün kavisli, altın kenarlıklı
 *  - 'tag': dairesel "madalya" (Devamlılık rozetleri) - üstünde küçük bir
 *    asma halkası olan, referans görseldeki "Günlük Giriş Rozetleri"
 *    madalyalarına uygun
 */
export function BadgeShield({ shape, unlocked, numberLabel, topIcon, icon }: BadgeShieldProps) {
  const colorClasses = unlocked
    ? 'border-scoreboard-amber bg-gradient-to-b from-scoreboard-amber/25 via-scoreboard-amber/10 to-transparent text-scoreboard-amber shadow-glow'
    : 'border-pitch-700/20 bg-pitch-700/10 text-pitch-700/30 dark:border-pitch-700/60 dark:bg-pitch-700/30 dark:text-pitch-100/20';

  const content = unlocked ? (
    numberLabel ? (
      <>
        {topIcon}
        <span className="font-mono text-base font-bold leading-none">{numberLabel}</span>
      </>
    ) : (
      icon
    )
  ) : (
    <Lock size={16} />
  );

  if (shape === 'tag') {
    return (
      <div className="flex flex-col items-center">
        {/* Asma halkası */}
        <div className={`h-2.5 w-4 rounded-t-full border-2 border-b-0 ${colorClasses}`} />
        {/* Dairesel madalya gövdesi */}
        <div
          className={`flex h-13 w-13 flex-col items-center justify-center gap-0.5 rounded-full border-2 ${colorClasses}`}
          style={{ height: '52px', width: '52px' }}
        >
          {content}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ clipPath: SHIELD_CLIP_PATH }}
      className={`relative flex h-14 w-14 flex-col items-center justify-center gap-0.5 pt-1.5 border-2 ${colorClasses}`}
    >
      {content}
    </div>
  );
}
