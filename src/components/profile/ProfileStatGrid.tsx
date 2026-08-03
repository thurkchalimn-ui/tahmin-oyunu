import type { ReactNode } from 'react';
import { Users, UserPlus, BarChart3 } from 'lucide-react';
import { IconBadge } from '@/components/common/IconBadge';

interface ProfileStatGridProps {
  followerCount: number | null;
  followingCount: number | null;
  rank: number | null;
}

/**
 * Profil sayfasındaki üst istatistik şeridi: Takipçi / Takip Edilen /
 * Sıralama. NOT: Toplam Tahmin, Doğru Tahmin ve Başarı Oranı artık burada
 * DEĞİL - "Performans Özeti" bölümünde (bkz. PerformanceSummary.tsx) daha
 * zengin haliyle gösteriliyor, aynı sayıları iki kez göstermemek için buradan
 * kaldırıldı.
 */
export function ProfileStatGrid({ followerCount, followingCount, rank }: ProfileStatGridProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Tile icon={<Users size={16} />} value={followerCount ?? '—'} label="Takipçi" />
      <Tile icon={<UserPlus size={16} />} value={followingCount ?? '—'} label="Takip Edilen" />
      <Tile icon={<BarChart3 size={16} />} value={rank ?? '—'} label="Sıralama" prefix={rank ? '#' : ''} />
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
      className="flex flex-col items-center gap-1.5 rounded-xl border border-pitch-700/15 bg-gradient-to-b
        from-white to-pitch-100 p-3 text-center shadow-stadium dark:border-pitch-700 dark:from-pitch-800 dark:to-pitch-900"
    >
      <IconBadge icon={icon} size="sm" />
      <p className="font-mono text-base font-bold text-pitch-900 dark:text-pitch-100">
        {prefix}
        {value}
      </p>
      <p className="font-mono text-[9px] uppercase leading-tight text-pitch-700/60 dark:text-pitch-100/50">
        {label}
      </p>
    </div>
  );
}
