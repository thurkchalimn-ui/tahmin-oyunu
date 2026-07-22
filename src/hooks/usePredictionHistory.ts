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
            .sort((a, b) => {
              const aPending = a.prediction.isCorrect === null;
              const bPending = b.prediction.isCorrect === null;
              if (aPending !== bPending) return aPending ? -1 : 1; // sonuçlanmamışlar önce

              if (aPending) {
                // Sonuçlanmamışlar: en erken başlayacak üstte.
                return new Date(a.match.kickoffAt).getTime() - new Date(b.match.kickoffAt).getTime();
              }
              // Sonuçlananlar: önce en son güne ait maçlar, aynı gün içinde de
              // dayOrder'a göre 20'den geriye doğru (ana sayfadaki HomePage.tsx
              // ile birebir aynı mantık).
              if (a.match.date !== b.match.date) return a.match.date < b.match.date ? 1 : -1;
              return b.match.dayOrder - a.match.dayOrder;
            });

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
