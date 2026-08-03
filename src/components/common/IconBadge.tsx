import type { ReactNode } from 'react';

interface IconBadgeProps {
  icon: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES: Record<NonNullable<IconBadgeProps['size']>, string> = {
  sm: 'h-8 w-8',
  md: 'h-11 w-11',
  lg: 'h-14 w-14',
};

/**
 * Reklam görselindeki gibi dairesel, koyu zeminli, altın çerçeveli ikon
 * rozeti. `icon` bir React node'u olmalı - EMOJİ DEĞİL, gerçek bir ikon
 * bileşeni (ör. `lucide-react`'tan `<Flame />`) - bu, farklı işletim
 * sistemlerinde/tarayıcılarda tutarsız/renkli emoji görünümü yerine, her
 * yerde aynı görünen, tek renkli, temiz bir ikon sağlar. Renk paleti kendi
 * scoreboard.amber tonumuz.
 */
export function IconBadge({ icon, size = 'md' }: IconBadgeProps) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full border border-scoreboard-amber/50
        bg-pitch-950 text-scoreboard-amber shadow-glow ${SIZE_CLASSES[size]}`}
    >
      {icon}
    </span>
  );
}
