import { useEffect, useState } from 'react';
import { collection, query, where, documentId, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { getPeriodLeaderboard } from '@/services/periodLeaderboardService';
import { getAllTimeTopThree } from '@/services/homeSummaryService';
import type { UserProfile } from '@/types';

interface WeeklyTopThreeResult {
  data: UserProfile[];
  loading: boolean;
  /** Haftalık veri yeterliyse 'week', yetersizse (ör. hafta yeni başladıysa) yedek olarak 'all' gösterilir. */
  source: 'week' | 'all';
}

/**
 * Ana sayfadaki liderlik podyum önizlemesi için ilk 3 kullanıcıyı getirir.
 * Haftalık liderlik verisi henüz azsa (ör. hafta yeni başladığında maç
 * sayısı düşükse) otomatik olarak tüm-zamanlar liderlerine geçer.
 *
 * NOT: Ne haftalık önbellek ne de basit tüm-zamanlar sorgusu gerçek
 * `bestStreak` değerini içeriyordu (biri hiç tutmuyordu, diğeri hesaplamıyordu)
 * - bu yüzden bulunan 3 kullanıcının gerçek bestStreak değeri, `users`
 * koleksiyonundan küçük bir ek sorguyla (sadece 3 ID için) tamamlanıyor.
 */
export function useWeeklyTopThree(): WeeklyTopThreeResult {
  const [data, setData] = useState<UserProfile[]>([]);
  const [source, setSource] = useState<'week' | 'all'>('week');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const weekly = await getPeriodLeaderboard('week');
        let topThree: UserProfile[];
        let resolvedSource: 'week' | 'all';

        if (weekly.length >= 3) {
          topThree = weekly.slice(0, 3);
          resolvedSource = 'week';
        } else {
          const allTime = await getAllTimeTopThree();
          topThree = allTime as UserProfile[];
          resolvedSource = 'all';
        }

        // Gerçek bestStreak değerlerini tamamla
        if (topThree.length > 0) {
          const snap = await getDocs(
            query(collection(db, 'users'), where(documentId(), 'in', topThree.map((u) => u.uid))),
          );
          const bestStreakByUid = new Map(snap.docs.map((d) => [d.id, (d.data().bestStreak as number) ?? 0]));
          topThree = topThree.map((u) => ({ ...u, bestStreak: bestStreakByUid.get(u.uid) ?? u.bestStreak }));
        }

        if (!cancelled) {
          setData(topThree);
          setSource(resolvedSource);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, source };
}
