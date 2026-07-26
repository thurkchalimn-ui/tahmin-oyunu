import type { Badge } from '@/types';

interface BadgeIconsProps {
  badges: Badge[];
  size?: 'sm' | 'md';
}

export const BADGE_ICONS: Record<Badge['type'], string> = {
  matchStreak: '🏆',
  correctTotal: '🎯',
  activityStreak: '🔥',
};

export const BADGE_LABELS: Record<Badge['type'], (value: number) => string> = {
  matchStreak: (v) => `${v} maçlık seri`,
  correctTotal: (v) => `${v} doğru tahmin`,
  activityStreak: (v) => `${v} gün üst üste giriş`,
};

const ICONS = BADGE_ICONS;
const LABELS = BADGE_LABELS;

/**
 * Kullanıcının rozetlerini küçük ikonlar olarak gösterir. Her rozet türünden
 * (matchStreak/correctTotal/activityStreak) sadece en yüksek değerli olan
 * gösterilir - aksi halde bir kullanıcı 5 farklı eşiği geçmişse 5 ayrı ikon
 * kalabalık yaratırdı. Liderlik tablosu, profil ve sohbette ortak kullanılır.
 */
export function BadgeIcons({ badges, size = 'sm' }: BadgeIconsProps) {
  if (badges.length === 0) return null;

  const bestByType = new Map<Badge['type'], Badge>();
  for (const badge of badges) {
    const current = bestByType.get(badge.type);
    if (!current || badge.value > current.value) bestByType.set(badge.type, badge);
  }

  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <span className="inline-flex items-center gap-0.5">
      {[...bestByType.values()].map((badge) => (
        <span key={badge.type} title={LABELS[badge.type](badge.value)} className={textSize}>
          {ICONS[badge.type]}
        </span>
      ))}
    </span>
  );
}
