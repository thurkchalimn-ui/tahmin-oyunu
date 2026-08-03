import { useEffect, useState } from 'react';
import { getPeriodLeaderboard } from '@/services/periodLeaderboardService';
import type { UserProfile } from '@/types';

/** Ana sayfadaki haftalık liderlik podyum önizlemesi için ilk 3 kullanıcıyı getirir. */
export function useWeeklyTopThree(): { data: UserProfile[]; loading: boolean } {
  const [data, setData] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getPeriodLeaderboard('week')
      .then((list) => {
        if (!cancelled) setData(list.slice(0, 3));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading };
}
