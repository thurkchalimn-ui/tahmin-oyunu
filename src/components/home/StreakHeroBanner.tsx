import { Flame, Trophy } from 'lucide-react';

interface StreakHeroBannerProps {
  currentStreak: number;
  bestStreak: number;
}

/**
 * Ana sayfadaki seri bandı - "Güncel Serin" ve "En İyi Seri"yi yan yana
 * gösterir. Diğer kartlarla (Bugünün Maçları vb.) aynı beyaz/koyu temayı
 * kullanır - önceden altın/sarı zeminliydi, artık uygulamanın geri kalanıyla
 * tutarlı.
 */
export function StreakHeroBanner({ currentStreak, bestStreak }: StreakHeroBannerProps) {
  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-pitch-700/15 bg-gradient-to-br
        from-white to-pitch-100 p-5 shadow-stadium dark:border-pitch-700 dark:from-pitch-900 dark:to-pitch-950"
    >
      <div className="relative grid grid-cols-2 divide-x divide-pitch-700/10 dark:divide-pitch-700/50">
        <div className="flex flex-col items-center gap-1.5 pr-2">
          <span className="font-mono text-[11px] font-bold uppercase tracking-wide text-pitch-700/60 dark:text-pitch-100/50">
            Güncel Serin
          </span>
          <span className="flex items-center gap-2">
            <Flame size={32} className="text-scoreboard-amber" />
            <span className="font-display text-4xl font-bold text-pitch-900 dark:text-pitch-100">{currentStreak}</span>
          </span>
        </div>
        <div className="flex flex-col items-center gap-1.5 pl-2">
          <span className="font-mono text-[11px] font-bold uppercase tracking-wide text-pitch-700/60 dark:text-pitch-100/50">
            En İyi Seri
          </span>
          <span className="flex items-center gap-2">
            <Trophy size={32} className="text-scoreboard-amber" />
            <span className="font-display text-4xl font-bold text-pitch-900 dark:text-pitch-100">{bestStreak}</span>
          </span>
        </div>
      </div>
    </section>
  );
}
