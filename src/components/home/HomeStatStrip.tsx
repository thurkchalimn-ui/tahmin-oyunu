import { IconBadge } from '@/components/common/IconBadge';

interface HomeStatStripProps {
  dailyStreak: number;
  correctPredictions: number;
  rank: number | null;
}

/**
 * "Günlük Seri / Doğru Tahmin / Sıralama" üç kutucuklu istatistik şeridi.
 * Reklam görselindeki stat şeridine benziyor ama XP/Ödül gibi elimizde
 * olmayan verileri içermiyor - sadece gerçek, mevcut verilerimiz.
 */
export function HomeStatStrip({ dailyStreak, correctPredictions, rank }: HomeStatStripProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Tile icon="🔥" value={dailyStreak} label="Günlük Seri" />
      <Tile icon="✅" value={correctPredictions} label="Doğru Tahmin" />
      <Tile icon="📊" value={rank ?? '—'} label="Sıralama" prefix={rank ? '#' : ''} />
    </div>
  );
}

function Tile({
  icon,
  value,
  label,
  prefix = '',
}: {
  icon: string;
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
