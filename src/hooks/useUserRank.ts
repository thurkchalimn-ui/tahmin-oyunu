import { useEffect, useState } from 'react';
import { getUserRank } from '@/services/homeSummaryService';

/** Kullanıcının tüm-zamanlar doğru tahmin sayısına göre yaklaşık genel sıralamasını getirir. */
export function useUserRank(correctPredictions: number | undefined): number | null {
  const [rank, setRank] = useState<number | null>(null);

  useEffect(() => {
    if (correctPredictions === undefined) return;
    let cancelled = false;
    getUserRank(correctPredictions).then((r) => {
      if (!cancelled) setRank(r);
    });
    return () => {
      cancelled = true;
    };
  }, [correctPredictions]);

  return rank;
}
