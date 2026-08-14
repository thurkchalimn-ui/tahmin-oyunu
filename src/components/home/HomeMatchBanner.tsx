import { Link } from 'react-router-dom';
import { Calendar, ArrowRight } from 'lucide-react';

interface HomeMatchBannerProps {
  predictedCount: number;
  totalCount: number;
}

/**
 * Ana sayfanın en üstündeki büyük, vurgulu banner - bugün kaç maça tahmin
 * yapıldığını gösterir. Başlıkta takvim ikonu var; altta ayrıca "Günün
 * Maçlarını Gör →" satırı, tıklanınca maçların listelendiği ayrı sayfaya
 * (/maclar) yönlendiriyor. ÖNEMLİ: Arka plan artık açık modda beyaz,
 * koyu modda pitch tonlarında - önceden `dark:` öneki olmadan sabit koyu
 * renk kullanıldığı için açık moda geçildiğinde bile koyu kalıyordu.
 */
export function HomeMatchBanner({ predictedCount, totalCount }: HomeMatchBannerProps) {
  if (totalCount === 0) return null;

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-pitch-700/15 bg-gradient-to-br
        from-white to-pitch-100 p-6 shadow-stadium dark:border-pitch-700 dark:from-pitch-900 dark:to-pitch-950"
    >
      {/* Dekoratif ışık - kendi scoreboard.amber rengimizden */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-scoreboard-amber opacity-30 blur-2xl"
      />

      <p className="relative flex items-center gap-2 font-mono text-xs uppercase tracking-wide text-pitch-700/60 dark:text-pitch-100/60">
        <Calendar size={15} className="text-scoreboard-amber" />
        Bugünün Maçları
      </p>
      <p className="relative mt-1 font-display text-4xl font-bold text-pitch-900 dark:text-pitch-100">
        {predictedCount}{' '}
        <span className="text-xl font-normal text-pitch-700/50 dark:text-pitch-100/50">/ {totalCount}</span>
      </p>
      <p className="relative mt-1 font-body text-sm text-pitch-700/70 dark:text-pitch-100/70">
        {predictedCount >= totalCount
          ? 'Bugünkü tüm maçlara tahmin yaptın! 🎉'
          : 'Tahminlerini yap, serini büyüt!'}
      </p>

      <Link
        to="/maclar"
        className="relative mt-4 flex items-center gap-1.5 font-display text-sm font-semibold text-scoreboard-amberDark
          transition hover:gap-2.5 dark:text-scoreboard-amber"
      >
        Günün Maçlarını Gör
        <ArrowRight size={16} />
      </Link>
    </section>
  );
}
