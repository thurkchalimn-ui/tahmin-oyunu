import { useEffect, useState } from 'react';
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
 * sayısı düşükse) otomatik olarak tüm-zamanlar liderlerine geçer - böylece
 * podyum haftanın başında boş/gizli kalmaz.
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
        if (cancelled) return;
        if (weekly.length >= 3) {
          setData(weekly.slice(0, 3));
          setSource('week');
        } else {
          const allTime = await getAllTimeTopThree();
          if (cancelled) return;
          setData(allTime as UserProfile[]);
          setSource('all');
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
