import { useEffect, useState } from 'react';
import type { AsyncState, UserProfile } from '@/types';
import { getPeriodLeaderboard, type LeaderboardPeriod } from '@/services/periodLeaderboardService';

/** Belirli bir dönem (hafta/ay) için liderlik tablosunu getirir. */
export function usePeriodLeaderboard(period: LeaderboardPeriod): AsyncState<UserProfile[]> {
  const [state, setState] = useState<AsyncState<UserProfile[]>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState({ data: null, loading: true, error: null });
    getPeriodLeaderboard(period)
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch(() => {
        if (!cancelled) setState({ data: null, loading: false, error: 'Liderlik tablosu yüklenemedi.' });
      });
    return () => {
      cancelled = true;
    };
  }, [period]);

  return state;
}
