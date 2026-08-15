import { Link } from 'react-router-dom';
import { Flame, Trophy, Star } from 'lucide-react';

/**
 * Giriş yapmamış (misafir) ziyaretçilere ana sayfanın en üstünde gösterilen
 * karşılama bölümü - oyunu kısaca tanıtır, "Nasıl Oynanır" sayfasına ve
 * kayıt olmaya yönlendirir. Giriş yapmış kullanıcılara HİÇ gösterilmez.
 */
export function GuestWelcomeBanner() {
  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-pitch-700/15 bg-gradient-to-br
        from-white to-pitch-100 p-6 text-center shadow-stadium dark:border-pitch-700 dark:from-pitch-900 dark:to-pitch-950"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-scoreboard-amber opacity-25 blur-2xl"
      />

      <h1 className="relative font-display text-2xl font-bold text-pitch-900 dark:text-pitch-100">
        Tahmin Serisi'ne Hoş Geldin! ⚽
      </h1>
      <p className="relative mx-auto mt-2 max-w-md font-body text-sm text-pitch-700/70 dark:text-pitch-100/70">
        Günlük maçları tahmin et, serini büyüt, rozet ve XP kazan, arkadaşlarınla yarış -
        tamamen ücretsiz, gerçek para veya bahis içermez.
      </p>

      <div className="relative mt-4 flex justify-center gap-6 font-mono text-xs text-pitch-700/60 dark:text-pitch-100/50">
        <span className="flex items-center gap-1.5">
          <Flame size={14} className="text-scoreboard-amber" />
          Seri Yap
        </span>
        <span className="flex items-center gap-1.5">
          <Star size={14} className="text-scoreboard-amber" />
          XP Kazan
        </span>
        <span className="flex items-center gap-1.5">
          <Trophy size={14} className="text-scoreboard-amber" />
          Liderlik Tablosunda Yarış
        </span>
      </div>

      <div className="relative mt-5 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
        <Link
          to="/kayit"
          className="w-full rounded-lg bg-scoreboard-amber px-6 py-2.5 font-display text-sm font-semibold
            text-pitch-950 shadow-glow transition hover:brightness-105 sm:w-auto"
        >
          Ücretsiz Kayıt Ol
        </Link>
        <Link
          to="/nasil-oynanir"
          className="font-mono text-xs text-scoreboard-amberDark underline dark:text-scoreboard-amber"
        >
          Nasıl Oynanır?
        </Link>
      </div>
    </section>
  );
}
