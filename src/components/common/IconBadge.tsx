interface IconBadgeProps {
  icon: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES: Record<NonNullable<IconBadgeProps['size']>, string> = {
  sm: 'h-8 w-8 text-base',
  md: 'h-11 w-11 text-xl',
  lg: 'h-14 w-14 text-2xl',
};

/**
 * Reklam görselindeki gibi dairesel, koyu zeminli, altın çerçeveli ikon
 * rozeti. Ham emoji yerine tutarlı, "premium" bir çerçeve verir. Kendi
 * pitch/scoreboard renk paletimizi kullanır.
 */
export function IconBadge({ icon, size = 'md' }: IconBadgeProps) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full border border-scoreboard-amber/50
        bg-pitch-950 shadow-glow ${SIZE_CLASSES[size]}`}
    >
      {icon}
    </span>
  );
}
