import { useEffect, useState } from 'react';
import type { AsyncState, Match, Prediction } from '@/types';
import { subscribeUserPredictions } from '@/services/predictionService';
import { getMatchesByIds } from '@/services/matchService';

export interface PredictionHistoryItem {
  match: Match;
  prediction: Prediction;
}

/**
 * Bir kullanıcının tüm tahminlerini, ait oldukları maçın bilgileriyle
 * (takım adları, saat) birleştirerek, en yeni maç en üstte olacak şekilde getirir.
 */
export function usePredictionHistory(uid: string | undefined): AsyncState<PredictionHistoryItem[]> {
  const [state, setState] = useState<AsyncState<PredictionHistoryItem[]>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!uid) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    setState({ data: null, loading: true, error: null });

    const unsubscribe = subscribeUserPredictions(
      uid,
      async (predictions) => {
        try {
          const matches = await getMatchesByIds(predictions.map((p) => p.matchId));
          const matchById = new Map(matches.map((m) => [m.id, m]));

          const items = predictions
            .map((prediction) => {
              const match = matchById.get(prediction.matchId);
              return match ? { match, prediction } : null;
            })
            .filter((item): item is PredictionHistoryItem => item !== null)
            .sort((a, b) => new Date(b.match.kickoffAt).getTime() - new Date(a.match.kickoffAt).getTime());

          setState({ data: items, loading: false, error: null });
        } catch {
          setState({ data: null, loading: false, error: 'Tahmin geçmişi yüklenemedi.' });
        }
      },
      (error) => setState({ data: null, loading: false, error }),
    );
    return unsubscribe;
  }, [uid]);

  return state;
}
