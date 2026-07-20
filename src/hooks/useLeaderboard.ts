import { useEffect, useState } from 'react';
import type { UserProfile, AsyncState } from '@/types';
import { subscribeLeaderboard } from '@/services/userService';

/** Liderlik tablosunu (en yüksek seriye göre sıralı) gerçek zamanlı getirir. */
export function useLeaderboard(): AsyncState<UserProfile[]> {
  const [state, setState] = useState<AsyncState<UserProfile[]>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = subscribeLeaderboard(
      (users) => setState({ data: users, loading: false, error: null }),
      (error) => setState({ data: null, loading: false, error }),
    );
    return unsubscribe;
  }, []);

  return state;
}
