import { Flame, Trophy } from 'lucide-react';

interface StreakHeroBannerProps {
  currentStreak: number;
  bestStreak: number;
}

/**
 * Ana sayfanın en üstündeki büyük, altın renkli seri bandı - "Güncel Serin"
 * ve "En İyi Seri"yi yan yana, öne çıkan bir şekilde gösterir. Ana sayfanın
 * "boş" hissetmemesi için eklenen, ilk bakışta dikkat çeken hero bandı.
 */
export function StreakHeroBanner({ currentStreak, bestStreak }: StreakHeroBannerProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-scoreboard-amber to-scoreboard-amberDark p-5 shadow-glow">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/15 blur-2xl"
      />
      <div className="relative grid grid-cols-2 divide-x divide-pitch-950/15">
        <div className="flex flex-col items-center gap-1.5 pr-2">
          <span className="font-mono text-[11px] font-bold uppercase tracking-wide text-pitch-950/70">
            Güncel Serin
          </span>
          <span className="flex items-center gap-2">
            <Flame size={32} className="text-pitch-950/80" />
            <span className="font-display text-4xl font-bold text-pitch-950">{currentStreak}</span>
          </span>
        </div>
        <div className="flex flex-col items-center gap-1.5 pl-2">
          <span className="font-mono text-[11px] font-bold uppercase tracking-wide text-pitch-950/70">
            En İyi Seri
          </span>
          <span className="flex items-center gap-2">
            <Trophy size={32} className="text-pitch-950/80" />
            <span className="font-display text-4xl font-bold text-pitch-950">{bestStreak}</span>
          </span>
        </div>
      </div>
    </section>
  );
}
