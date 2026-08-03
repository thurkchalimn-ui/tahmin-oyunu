import { useState } from 'react';

interface AvatarProps {
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'h-5 w-5 text-xs',
  md: 'h-8 w-8 text-base',
  lg: 'h-14 w-14 text-2xl',
  xl: 'h-24 w-24 text-3xl', // md'nin tam 3 katı (32px -> 96px) - podyum 2./3. sıra için
  '2xl': 'h-44 w-44 text-5xl', // lg'nin ~3 katından fazla (56px -> 176px) - podyum 1. sıra için
};

/**
 * Kullanıcının profil görselini gösterir (kendi seçtiği bir futbolcu fotoğrafı,
 * takım logosu ya da başka bir görsel linki). Görsel yoksa veya yüklenemezse
 * (bozuk link vb.) otomatik olarak ⚽ ikonuna düşer - sayfa asla bozuk görünmez.
 *
 * ÖNEMLİ: `object-cover` yerine `object-contain` kullanılıyor. Avatarlar çoğu
 * zaman kare olmayan, şeffaf arka planlı takım logoları oluyor - `object-cover`
 * dairesel çerçeveyi doldurmak için görseli KIRPIYORDU (logonun kenarları
 * taşıyor/kesiliyordu). `object-contain` + hafif bir iç boşluk (padding),
 * logonun tamamının kırpılmadan, ortalanmış şekilde sığmasını sağlar.
 */
export function Avatar({ avatarUrl, size = 'md' }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const dimension = SIZE_CLASSES[size];

  if (avatarUrl && !failed) {
    return (
      <span
        className={`${dimension} flex shrink-0 items-center justify-center rounded-full bg-white p-0.5
          ring-1 ring-pitch-700/10 dark:ring-pitch-700`}
      >
        <img
          src={avatarUrl}
          alt="Profil görseli"
          onError={() => setFailed(true)}
          className="h-full w-full rounded-full object-contain"
        />
      </span>
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
