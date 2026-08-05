import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';

interface BadgeShieldProps {
  shape: 'shield' | 'tag';
  unlocked: boolean;
  numberLabel?: string;
  topIcon?: ReactNode;
  icon?: ReactNode;
}

// Klasik kalkan silüeti (Seri/Tahmin/Başarı rozetleri için)
const SHIELD_CLIP_PATH = 'polygon(50% 0%, 100% 15%, 100% 55%, 50% 100%, 0% 55%, 0% 15%)';

/**
 * Rozet gösterim şekli - iki varyant:
 *  - 'shield': klasik kalkan (Seri/Tahmin/Başarı rozetleri)
 *  - 'tag': üstünde küçük bir halkası olan "asma etiket" (Devamlılık
 *    rozetleri) - görseldeki takvim/etiket görünümüne uygun. Gerçek bir
 *    "delik" clip-path ile açılamadığı için, küçük bir halka + dikdörtgen
 *    gövde ile görsel olarak taklit edilir.
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
        {/* Etiket gövdesi */}
        <div
          className={`flex h-12 w-14 flex-col items-center justify-center gap-0.5 rounded-md border-2 ${colorClasses}`}
        >
          {content}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ clipPath: SHIELD_CLIP_PATH }}
      className={`relative flex h-14 w-14 flex-col items-center justify-center gap-0.5 border-2 ${colorClasses}`}
    >
      {content}
    </div>
  );
}
