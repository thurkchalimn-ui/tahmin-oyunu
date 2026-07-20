interface AdBannerProps {
  slot?: 'top' | 'bottom' | 'inline';
}

/**
 * Reklam alanı placeholder'ı. Web sürümünde bu alan Google AdSense ile,
 * mobil sürümde (Capacitor/React Native köprüsü) Google AdMob banner SDK'sı ile
 * doldurulacaktır. .env dosyasındaki VITE_ADMOB_BANNER_ID o entegrasyonda kullanılır.
 * Şimdilik yer tutucu olarak render edilir, böylece layout ileride kaymaz.
 */
export function AdBanner({ slot = 'inline' }: AdBannerProps) {
  return (
    <div
      data-ad-slot={slot}
      className="flex h-16 w-full items-center justify-center rounded-md border
        border-dashed border-pitch-700/30 bg-pitch-700/5 font-mono text-xs
        text-pitch-700/60 dark:border-pitch-700 dark:text-pitch-100/40"
    >
      Reklam Alanı ({slot})
    </div>
  );
}
