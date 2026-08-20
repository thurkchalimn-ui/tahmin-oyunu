import { useEffect, useState } from 'react';
import { collection, query, where, documentId, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { getAllTimeTopThree } from '@/services/homeSummaryService';
import type { UserProfile } from '@/types';

interface WeeklyTopThreeResult {
  data: UserProfile[];
  loading: boolean;
  /** ÖNEMLİ: Artık her zaman 'all' - ana sayfadaki podyum önizlemesi
   * kullanıcı isteği üzerine haftalık yerine GENEL (tüm-zamanlar) liderleri
   * gösteriyor. Alan, WeeklyPodium.tsx'in etiket göstermesi için korunuyor. */
  source: 'week' | 'all';
}

/**
 * Ana sayfadaki liderlik podyum önizlemesi için ilk 3 kullanıcıyı (GENEL/
 * tüm-zamanlar sıralamasına göre) getirir.
 *
 * NOT: Basit tüm-zamanlar sorgusu gerçek `bestStreak` değerini
 * içermeyebiliyordu - bu yüzden bulunan 3 kullanıcının gerçek bestStreak
 * değeri, `users` koleksiyonundan küçük bir ek sorguyla (sadece 3 ID için)
 * tamamlanıyor.
 */
export function useWeeklyTopThree(): WeeklyTopThreeResult {
  const [data, setData] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let topThree = (await getAllTimeTopThree()) as UserProfile[];

        // Gerçek bestStreak ve xp değerlerini tamamla
        if (topThree.length > 0) {
          const snap = await getDocs(
            query(collection(db, 'users'), where(documentId(), 'in', topThree.map((u) => u.uid))),
          );
          const dataByUid = new Map(
            snap.docs.map((d) => [
              d.id,
              { bestStreak: (d.data().bestStreak as number) ?? 0, xp: (d.data().xp as number) ?? 0 },
            ]),
          );
          topThree = topThree.map((u) => ({
            ...u,
            bestStreak: dataByUid.get(u.uid)?.bestStreak ?? u.bestStreak,
            xp: dataByUid.get(u.uid)?.xp ?? u.xp,
          }));
        }

        if (!cancelled) setData(topThree);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, source: 'all' };
}
