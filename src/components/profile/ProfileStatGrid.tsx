import type { ReactNode } from 'react';
import { Users, UserPlus, ListChecks, CheckCircle2, Percent, BarChart3 } from 'lucide-react';
import { IconBadge } from '@/components/common/IconBadge';

interface ProfileStatGridProps {
  followerCount: number | null;
  followingCount: number | null;
  totalPredictions: number;
  correctPredictions: number;
  rank: number | null;
}

/**
 * Profil sayfasındaki 6'lı istatistik ızgarası: Takipçi / Takip Edilen /
 * Toplam Tahmin / Doğru Tahmin / Başarı Oranı / Toplam Sıralama. Hepsi
 * gerçek, mevcut verilerimizden - XP/Seviye gibi elimizde olmayan hiçbir şey
 * eklenmedi.
 */
export function ProfileStatGrid({
  followerCount,
  followingCount,
  totalPredictions,
  correctPredictions,
  rank,
}: ProfileStatGridProps) {
  const accuracy = totalPredictions > 0 ? Math.round((correctPredictions / totalPredictions) * 100) : 0;

  return (
    <div className="grid grid-cols-3 gap-3">
      <Tile icon={<Users size={16} />} value={followerCount ?? '—'} label="Takipçi" />
      <Tile icon={<UserPlus size={16} />} value={followingCount ?? '—'} label="Takip Edilen" />
      <Tile icon={<BarChart3 size={16} />} value={rank ?? '—'} label="Sıralama" prefix={rank ? '#' : ''} />
      <Tile icon={<ListChecks size={16} />} value={totalPredictions} label="Toplam Tahmin" />
      <Tile icon={<CheckCircle2 size={16} />} value={correctPredictions} label="Doğru Tahmin" />
      <Tile icon={<Percent size={16} />} value={accuracy} label="Başarı Oranı" suffix="%" />
    </div>
  );
}

function Tile({
  icon,
  value,
  label,
  prefix = '',
  suffix = '',
}: {
  icon: ReactNode;
  value: number | string;
  label: string;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div
      className="flex flex-col items-center gap-1.5 rounded-xl border border-pitch-700/15 bg-gradient-to-b
        from-white to-pitch-100 p-3 text-center shadow-stadium dark:border-pitch-700 dark:from-pitch-800 dark:to-pitch-900"
    >
      <IconBadge icon={icon} size="sm" />
      <p className="font-mono text-base font-bold text-pitch-900 dark:text-pitch-100">
        {prefix}
        {value}
        {suffix}
      </p>
      <p className="font-mono text-[9px] uppercase leading-tight text-pitch-700/60 dark:text-pitch-100/50">
        {label}
      </p>
    </div>
  );
}
