import { useEffect, useState } from 'react';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '@/config/firebase';

/**
 * Kullanıcının XP'ye göre genel sıralamasını hesaplar (kendinden daha
 * yüksek XP'ye sahip kaç kullanıcı olduğunu sayıp +1 ekler). ÖNEMLİ: Bu,
 * `useUserRank.ts`'in YERİNE geçmiyor - o hâlâ "doğru tahmin sayısı"na göre
 * sıralama için var olabilir, ama Liderlik'in "Genel" sekmesi ve Ana
 * Sayfa'daki "Sıralama" artık XP'ye göre olduğu için, o gösterimlerde bu
 * hook kullanılmalı - aksi halde liderlik listesindeki gerçek pozisyon ile
 * "kendi sıran" gösterimi birbirini tutmaz (tam da yaşanan hata buydu).
 */
export function useXpRank(xp: number | undefined): number | null {
  const [rank, setRank] = useState<number | null>(null);

  useEffect(() => {
    if (xp === undefined) {
      setRank(null);
      return;
    }
    let cancelled = false;
    getCountFromServer(query(collection(db, 'users'), where('xp', '>', xp)))
      .then((snap) => {
        if (!cancelled) setRank(snap.data().count + 1);
      })
      .catch(() => {
        if (!cancelled) setRank(null);
      });
    return () => {
      cancelled = true;
    };
  }, [xp]);

  return rank;
}
