import type { ReactNode } from 'react';
import { TrendingUp, CheckCircle2, Percent, Target, ListChecks, Calendar, Flame, Star } from 'lucide-react';
import { IconBadge } from '@/components/common/IconBadge';

interface PerformanceSummaryProps {
  correctPredictions: number;
  totalPredictions: number;
  bestStreak: number;
  activityStreak: number;
  xp: number;
  memberSince: string; // ISO tarih
}

/** Tarihi 'DD Ay YYYY' formatında (Türkçe ay adıyla) gösterir. */
function formatMemberSince(iso: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Profil sayfasındaki "Performans Özeti" kartı - mockup'takiyle aynı ikon +
 * kutucuk düzeni: Doğru Tahmin, Başarı Oranı, En İyi Seri (mockup'ta "gün"
 * yazıyordu ama bizde bu bir MAÇ serisi - "maç" olarak düzeltildi), Toplam
 * Tahmin, Günlük Giriş Serisi, Kazanılan XP, Üyelik Tarihi.
 */
export function PerformanceSummary({
  correctPredictions,
  totalPredictions,
  bestStreak,
  activityStreak,
  xp,
  memberSince,
}: PerformanceSummaryProps) {
  const accuracy = totalPredictions > 0 ? Math.round((correctPredictions / totalPredictions) * 100) : 0;

  return (
    <section className="rounded-xl border border-pitch-700/15 bg-gradient-to-b from-white to-pitch-100 p-4 shadow-stadium dark:border-pitch-700 dark:from-pitch-800 dark:to-pitch-900">
      <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-pitch-900 dark:text-pitch-100">
        <IconBadge icon={<TrendingUp size={16} />} size="sm" />
        Performans Özeti
      </h2>

      <div className="grid grid-cols-3 gap-x-3 gap-y-4">
        <Stat icon={<CheckCircle2 size={15} />} value={correctPredictions} label="Doğru Tahmin" accent="text-pick-correct" />
        <Stat icon={<Percent size={15} />} value={`%${accuracy}`} label="Başarı Oranı" accent="text-pick-correct" />
        <Stat icon={<Target size={15} />} value={bestStreak} label="En İyi Seri (maç)" accent="text-scoreboard-amber" />
        <Stat icon={<ListChecks size={15} />} value={totalPredictions} label="Toplam Tahmin" />
        <Stat icon={<Flame size={15} />} value={activityStreak} label="Günlük Giriş Serisi" accent="text-scoreboard-amber" />
        <Stat icon={<Star size={15} />} value={xp} label="Kazanılan XP" accent="text-scoreboard-amber" />
        <Stat icon={<Calendar size={15} />} value={formatMemberSince(memberSince)} label="Üyelik Tarihi" small />
      </div>
    </section>
  );
}

function Stat({
  icon,
  value,
  label,
  accent,
  small = false,
}: {
  icon: ReactNode;
  value: number | string;
  label: string;
  accent?: string;
  small?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1 font-mono text-[10px] uppercase text-pitch-700/60 dark:text-pitch-100/50">
        {icon}
        {label}
      </span>
      <span
        className={`font-mono font-bold text-pitch-900 dark:text-pitch-100 ${
          small ? 'text-sm' : 'text-xl'
        } ${accent ?? ''}`}
      >
        {value}
      </span>
    </div>
  );
}
