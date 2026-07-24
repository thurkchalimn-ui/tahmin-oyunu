import { useState } from 'react';

interface AvatarProps {
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'h-5 w-5 text-xs',
  md: 'h-8 w-8 text-base',
  lg: 'h-14 w-14 text-2xl',
};

/**
 * Kullanıcının profil görselini gösterir (kendi seçtiği bir futbolcu fotoğrafı,
 * takım logosu ya da başka bir görsel linki). Görsel yoksa veya yüklenemezse
 * (bozuk link vb.) otomatik olarak ⚽ ikonuna düşer - sayfa asla bozuk görünmez.
 */
export function Avatar({ avatarUrl, size = 'md' }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const dimension = SIZE_CLASSES[size];

  if (avatarUrl && !failed) {
    return (
      <img
        src={avatarUrl}
        alt="Profil görseli"
        onError={() => setFailed(true)}
        className={`${dimension} shrink-0 rounded-full bg-white object-cover ring-1 ring-pitch-700/10 dark:ring-pitch-700`}
      />
    );
  }

  return (
    <span
      className={`${dimension} flex shrink-0 items-center justify-center rounded-full bg-pitch-700/10 dark:bg-pitch-700`}
      aria-hidden="true"
    >
      ⚽
    </span>
  );
}
