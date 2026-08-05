import type { ReactNode } from 'react';
import type { UserProfile } from '@/types';

export interface BadgeCatalogItem {
  id: string;
  numberLabel?: string; // Kalkanın içine yazılacak sayı (ör. "15")
  icon?: ReactNode; // numberLabel yoksa gösterilecek ikon (ör. Efsane Seri için taç)
  subLabel: string; // Kalkanın altındaki metin (ör. "15 Doğru")
  isUnlocked: (profile: UserProfile) => boolean;
}

export interface BadgeCategory {
  key: string;
  title: string;
  description: string;
  items: BadgeCatalogItem[];
}

/**
 * Rozet kataloğu - "Rozetler" bölümündeki 4 kategori (Seri, Devamlılık,
 * Tahmin, Başarı) ve her birinin tüm eşiklerini (kilitli/kilitsiz olsun)
 * tanımlar. Seri/Devamlılık/Tahmin kategorileri, kullanıcının GERÇEKTEN
 * KAZANMIŞ olduğu (badges dizisinde kalıcı olarak saklanan) eşiklere göre
 * kilit açar - bkz. userService.ts'deki genişletilmiş eşik listeleri.
 * Başarı kategorisi ise ayrı bir rozet kaydı gerektirmez, doğrudan mevcut
 * istatistiklerden (totalPredictions, bestStreak, badges.length) türetilir.
 */
export function getBadgeCategories(): BadgeCategory[] {
  const hasMatchStreak = (profile: UserProfile, value: number) =>
    profile.badges.some((b) => b.type === 'matchStreak' && b.value === value);
  const hasActivityStreak = (profile: UserProfile, value: number) =>
    profile.badges.some((b) => b.type === 'activityStreak' && b.value === value);
  const hasCorrectTotal = (profile: UserProfile, value: number) =>
    profile.badges.some((b) => b.type === 'correctTotal' && b.value === value);

  const seriValues = [3, 5, 10, 15, 20, 30, 50];
  const devamlilikValues = [3, 7, 15, 30, 60, 100, 365];
  const tahminValues = [50, 100, 250, 500, 1000, 2500, 5000];

  const categories: BadgeCategory[] = [
    {
      key: 'seri',
      title: 'Seri Rozetleri',
      description: 'Arka arkaya doğru tahmin yap ve serini en üst seviyeye çıkar.',
      items: [
        ...seriValues.map((v) => ({
          id: `matchStreak-${v}`,
          numberLabel: String(v),
          subLabel: `${v} Doğru`,
          isUnlocked: (p: UserProfile) => hasMatchStreak(p, v),
        })),
        {
          id: 'matchStreak-legendary',
          subLabel: 'Efsane Seri',
          isUnlocked: (p: UserProfile) => hasMatchStreak(p, 100),
        },
      ],
    },
    {
      key: 'devamlilik',
      title: 'Devamlılık Rozetleri',
      description: 'Her gün uygulamaya gir, serini koru.',
      items: devamlilikValues.map((v) => ({
        id: `activityStreak-${v}`,
        numberLabel: String(v),
        subLabel: `${v} Gün`,
        isUnlocked: (p: UserProfile) => hasActivityStreak(p, v),
      })),
    },
    {
      key: 'tahmin',
      title: 'Tahmin Rozetleri',
      description: 'Toplam doğru tahmin sayını artır.',
      items: tahminValues.map((v) => ({
        id: `correctTotal-${v}`,
        numberLabel: String(v),
        subLabel: `${v} Doğru`,
        isUnlocked: (p: UserProfile) => hasCorrectTotal(p, v),
      })),
    },
    {
      key: 'basari',
      title: 'Başarı Rozetleri',
      description: 'Özel başarılarla koleksiyonunu tamamla.',
      items: [
        {
          id: 'first-prediction',
          subLabel: 'İlk Tahmin',
          isUnlocked: (p: UserProfile) => p.totalPredictions >= 1,
        },
        {
          id: 'first-10-streak',
          subLabel: 'İlk 10 Seri',
          isUnlocked: (p: UserProfile) => p.bestStreak >= 10,
        },
        {
          id: 'first-15-streak',
          subLabel: 'İlk 15 Seri',
          isUnlocked: (p: UserProfile) => p.bestStreak >= 15,
        },
        {
          id: 'first-badge',
          subLabel: 'İlk Rozet',
          isUnlocked: (p: UserProfile) => p.badges.length >= 1,
        },
        {
          id: 'ten-badges',
          subLabel: '10 Rozet',
          isUnlocked: (p: UserProfile) => p.badges.length >= 10,
        },
        {
          id: 'twentyfive-badges',
          subLabel: '25 Rozet',
          isUnlocked: (p: UserProfile) => p.badges.length >= 25,
        },
        {
          id: 'all-badges',
          subLabel: 'Tüm Rozetler',
          // Seri + Devamlılık + Tahmin kategorilerindeki tüm rozetleri
          // kazanmış olmak (bu kendi kategorisindeki diğer öğeler hariç)
          isUnlocked: (p: UserProfile) =>
            p.badges.length >= seriValues.length + devamlilikValues.length + tahminValues.length,
        },
      ],
    },
  ];

  return categories;
}

/** Tüm kategorilerdeki toplam rozet sayısı ve kaç tanesinin kazanıldığı. */
export function getBadgeCompletionStats(profile: UserProfile): { earned: number; total: number } {
  const categories = getBadgeCategories();
  let earned = 0;
  let total = 0;
  for (const cat of categories) {
    for (const item of cat.items) {
      total += 1;
      if (item.isUnlocked(profile)) earned += 1;
    }
  }
  return { earned, total };
}
