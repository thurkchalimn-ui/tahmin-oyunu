import { useState } from 'react';

interface TeamLogoProps {
  name: string;
  logoUrl?: string;
  size?: 'sm' | 'md';
}

/**
 * Takım logosunu gösterir. Logo linki yoksa veya yüklenemezse (bozuk link vb.),
 * takımın baş harfini gösteren bir daire yer tutucuya otomatik olarak düşer.
 */
export function TeamLogo({ name, logoUrl, size = 'md' }: TeamLogoProps) {
  const [failed, setFailed] = useState(false);
  const dimension = size === 'sm' ? 'h-5 w-5' : 'h-8 w-8';

  if (logoUrl && !failed) {
    return (
      <img
        src={logoUrl}
        alt={name}
        onError={() => setFailed(true)}
        className={`${dimension} shrink-0 rounded-full bg-white object-contain ring-1 ring-pitch-700/10 dark:ring-pitch-700`}
      />
    );
  }

  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <span
      className={`${dimension} flex shrink-0 items-center justify-center rounded-full bg-pitch-700/10
        font-mono text-xs font-bold text-pitch-700 dark:bg-pitch-700 dark:text-pitch-100`}
    >
      {initial}
    </span>
  );
}
