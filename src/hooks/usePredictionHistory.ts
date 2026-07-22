import { useEffect, useState } from 'react';
import type { AsyncState, Match, Prediction } from '@/types';
import { subscribeUserPredictions } from '@/services/predictionService';
import { getMatchesByIds } from '@/services/matchService';
import { compareMatchesAscending, compareMatchesDescending } from '@/utils/matchNumbering';

export interface PredictionHistoryItem {
  match: Match;
  prediction: Prediction;
}

/**
 * Bir kullanıcının tüm tahminlerini, ait oldukları maçın bilgileriyle
 * (takım adları, saat) birleştirerek getirir. Sıralama, ana sayfadaki ve
 * seri hesaplamasındaki (bkz. matchNumbering.ts) mantıkla birebir aynıdır:
 * sonuçlanmamış tahminler en erken başlayacak üstte, sonuçlananlar en son
 * başlayan üstte; aynı saatte başlayanlarda ev sahibi takım adına göre
 * alfabetik sıralamanın tersi uygulanır.
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
              return aPending
                ? compareMatchesAscending(a.match, b.match)
                : compareMatchesDescending(a.match, b.match);
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
