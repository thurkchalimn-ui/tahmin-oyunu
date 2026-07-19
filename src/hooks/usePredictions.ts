import { useEffect, useState } from 'react';
import type { Prediction, AsyncState } from '@/types';
import { subscribeUserPredictions } from '@/services/predictionService';

/** Giriş yapmış kullanıcının tüm tahminlerini gerçek zamanlı olarak getirir. */
export function usePredictions(userId: string | undefined): AsyncState<Prediction[]> {
  const [state, setState] = useState<AsyncState<Prediction[]>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!userId) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    setState({ data: null, loading: true, error: null });
    const unsubscribe = subscribeUserPredictions(
      userId,
      (predictions) => setState({ data: predictions, loading: false, error: null }),
      (error) => setState({ data: null, loading: false, error }),
    );
    return unsubscribe;
  }, [userId]);

  return state;
}
