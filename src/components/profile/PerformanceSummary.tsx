import type { ReactNode } from 'react';
import { TrendingUp, CheckCircle2, Percent, Target, ListChecks, Flame, Star } from 'lucide-react';
import { IconBadge } from '@/components/common/IconBadge';

interface PerformanceSummaryProps {
  correctPredictions: number;
  totalPredictions: number;
  bestStreak: number;
  activityStreak: number;
  xp: number;
}

/**
 * Profil sayfasındaki "Performans Özeti" kartı: Doğru Tahmin, Başarı Oranı,
 * En İyi Seri (maç), Toplam Tahmin, Günlük Giriş Serisi, Kazanılan XP.
 * "Üyelik Tarihi" kaldırıldı.
 */
export function PerformanceSummary({
  correctPredictions,
  totalPredictions,
  bestStreak,
  activityStreak,
  xp,
}: PerformanceSummaryProps) {
  const accuracy = totalPredictions > 0 ? Math.round((correctPredictions / totalPredictions) * 100) : 0;

  return (
    <section className="rounded-xl border border-pitch-700/15 bg-gradient-to-b from-white to-pitch-100 p-4 shadow-stadium dark:border-pitch-700 dark:from-pitch-800 dark:to-pitch-900">
      <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-pitch-900 dark:text-pitch-100">
        <IconBadge icon={<TrendingUp size={16} />} size="sm" />
        Performans Özeti
      </h2>

      <div className="grid grid-cols-3 gap-x-3 gap-y-4">
        <Stat icon={<CheckCircle2 size={15} />} value={correctPredictions} label="Doğru Tahmin" />
        <Stat icon={<Percent size={15} />} value={`%${accuracy}`} label="Başarı Oranı" />
        <Stat icon={<Target size={15} />} value={bestStreak} label="En İyi Seri (maç)" />
        <Stat icon={<ListChecks size={15} />} value={totalPredictions} label="Toplam Tahmin" />
        <Stat icon={<Flame size={15} />} value={activityStreak} label="Günlük Giriş Serisi" />
        <Stat icon={<Star size={15} />} value={xp} label="Kazanılan XP" />
      </div>
    </section>
  );
}

function Stat({ icon, value, label }: { icon: ReactNode; value: number | string; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1 font-mono text-[10px] uppercase text-pitch-700/60 dark:text-pitch-100/50">
        {icon}
        {label}
      </span>
      {/* ÖNEMLİ: scoreboard-amber sabit bir renk (koyu/açık moddan bağımsız) -
          hem siyah hem beyaz arayüzde okunur olduğu için ayrıca dark: eki
          gerekmiyor. Kullanıcı isteği: tüm sayılar sarı görünsün. */}
      <span className="font-mono text-xl font-bold text-scoreboard-amber">{value}</span>
    </div>
  );
}
