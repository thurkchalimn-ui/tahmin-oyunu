import type { ReactNode } from 'react';
import { Flame, CheckCircle2, BarChart3, Star } from 'lucide-react';
import { IconBadge } from '@/components/common/IconBadge';

interface HomeStatStripProps {
  dailyStreak: number;
  correctPredictions: number;
  rank: number | null;
  xp: number;
}

/**
 * "Giriş Serisi / Doğru Tahmin / Sıralama / Toplam XP" dörtlü istatistik
 * şeridi. İkonlar emoji DEĞİL, lucide-react'tan gerçek ikon bileşenleri.
 */
export function HomeStatStrip({ dailyStreak, correctPredictions, rank, xp }: HomeStatStripProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      <Tile icon={<Flame size={16} />} value={dailyStreak} label="Giriş Serisi" />
      <Tile icon={<CheckCircle2 size={16} />} value={correctPredictions} label="Doğru Tahmin" />
      <Tile icon={<BarChart3 size={16} />} value={rank ?? '—'} label="Sıralama" prefix={rank ? '#' : ''} />
      <Tile icon={<Star size={16} />} value={xp} label="Toplam XP" />
    </div>
  );
}

function Tile({
  icon,
  value,
  label,
  prefix = '',
}: {
  icon: ReactNode;
  value: number | string;
  label: string;
  prefix?: string;
}) {
  return (
    <div
      className="flex flex-col items-center gap-2 rounded-xl border border-pitch-700/15 bg-gradient-to-b
        from-white to-pitch-100 p-3 text-center shadow-stadium dark:border-pitch-700 dark:from-pitch-800 dark:to-pitch-900"
    >
      <IconBadge icon={icon} size="sm" />
      <p className="font-mono text-lg font-bold text-pitch-900 dark:text-pitch-100">
        {prefix}
        {value}
      </p>
      <p className="font-mono text-[10px] uppercase leading-tight text-pitch-700/60 dark:text-pitch-100/50">
        {label}
      </p>
    </div>
  );
}
