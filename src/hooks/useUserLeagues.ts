import { useEffect, useState } from 'react';
import type { AsyncState, League } from '@/types';
import { subscribeUserLeagues } from '@/services/leagueService';

/** Kullanıcının üyesi olduğu tüm özel ligleri gerçek zamanlı getirir. */
export function useUserLeagues(uid: string | undefined): AsyncState<League[]> {
  const [state, setState] = useState<AsyncState<League[]>>({ data: null, loading: true, error: null });

  useEffect(() => {
    if (!uid) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    const unsubscribe = subscribeUserLeagues(
      uid,
      (leagues) => setState({ data: leagues, loading: false, error: null }),
      (error) => setState({ data: null, loading: false, error }),
    );
    return unsubscribe;
  }, [uid]);

  return state;
}
