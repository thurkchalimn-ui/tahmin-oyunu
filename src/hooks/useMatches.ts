import { useEffect, useState } from 'react';
import type { Match, AsyncState } from '@/types';
import { subscribeMatchesByDate } from '@/services/matchService';

/** Belirli bir tarihe ait maçları gerçek zamanlı olarak getirir. */
export function useMatches(date: string): AsyncState<Match[]> {
  const [state, setState] = useState<AsyncState<Match[]>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    setState({ data: null, loading: true, error: null });
    const unsubscribe = subscribeMatchesByDate(
      date,
      (matches) => setState({ data: matches, loading: false, error: null }),
      (error) => setState({ data: null, loading: false, error }),
    );
    return unsubscribe;
  }, [date]);

  return state;
}
