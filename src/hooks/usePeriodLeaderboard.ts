import { useEffect, useState } from 'react';
import type { UserProfile, AsyncState } from '@/types';
import { getPeriodLeaderboard, type LeaderboardPeriod } from '@/services/periodLeaderboardService';

/**
 * Haftalık/aylık liderlik tablosunu (önbellekten, tek okumayla) getirir.
 * `monthKey` verilirse ('2026-08' gibi) o AYIN geçmiş verisi çekilir -
 * verilmezse bugünün ayı kullanılır. `period === 'week'` iken `monthKey`
 * yok sayılır (haftalık için geçmiş tutulmuyor, sadece güncel hafta var).
 */
export function usePeriodLeaderboard(period: LeaderboardPeriod, monthKey?: string): AsyncState<UserProfile[]> {
  const [state, setState] = useState<AsyncState<UserProfile[]>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true }));
    getPeriodLeaderboard(period, monthKey)
      .then((users) => {
        if (!cancelled) setState({ data: users, loading: false, error: null });
      })
      .catch(() => {
        if (!cancelled) setState({ data: null, loading: false, error: 'Liderlik tablosu yüklenemedi.' });
      });
    return () => {
      cancelled = true;
    };
  }, [period, monthKey]);

  return state;
}
