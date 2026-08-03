import { useEffect, useState } from 'react';
import { getRecentResults } from '@/services/homeSummaryService';
import type { Match } from '@/types';

/** Ana sayfadaki "Son Maç Sonuçları" önizlemesi için en son birkaç sonuçlanmış maçı getirir. */
export function useRecentResults(count: number): { data: Match[]; loading: boolean } {
  const [data, setData] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getRecentResults(count)
      .then((results) => {
        if (!cancelled) setData(results);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [count]);

  return { data, loading };
}
