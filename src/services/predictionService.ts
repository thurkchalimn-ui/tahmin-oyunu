import { collection, doc, setDoc, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Prediction, PredictionChoice, Match } from '@/types';
import { isMatchLocked } from '@/utils/dateUtils';

function mapPredictionDoc(id: string, data: Record<string, unknown>): Prediction {
  const toIso = (v: unknown) => (v instanceof Timestamp ? v.toDate().toISOString() : (v as string) ?? '');
  return {
    id,
    userId: data.userId as string,
    matchId: data.matchId as string,
    matchGlobalOrder: data.matchGlobalOrder as number,
    date: (data.date as string) ?? '',
    choice: data.choice as PredictionChoice,
    isCorrect: (data.isCorrect as boolean | null) ?? null,
    createdAt: toIso(data.createdAt),
  };
}

/** Kullanıcının bir maç için tahminini kaydeder (maç kilitliyse reddedilir). */
export async function submitPrediction(
  userId: string,
  match: Match,
  choice: PredictionChoice,
): Promise<void> {
  if (isMatchLocked(match.kickoffAt)) {
    throw new Error('Bu maç başladığı için tahmin yapılamaz.');
  }
  const predictionId = `${userId}_${match.id}`;
  await setDoc(doc(db, 'predictions', predictionId), {
    userId,
    matchId: match.id,
    matchGlobalOrder: match.globalOrder,
    date: match.date,
    choice,
    isCorrect: null,
    createdAt: Timestamp.now(),
  });
}

/** Kullanıcının tüm tahminlerini gerçek zamanlı dinler. */
export function subscribeUserPredictions(
  userId: string,
  onChange: (predictions: Prediction[]) => void,
  onError: (message: string) => void,
): () => void {
  const q = query(collection(db, 'predictions'), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => mapPredictionDoc(d.id, d.data()))),
    () => onError('Tahminleriniz yüklenemedi.'),
  );
}

/**
 * Kullanıcının belirli bir güne ait toplam tahmin sayısını gerçek zamanlı dinler.
 * Günlük tahmin hakkı limitini hesaplamak için kullanılır (bkz. creditsService.ts).
 */
export function subscribeDailyPredictionCount(
  userId: string,
  date: string,
  onChange: (count: number) => void,
  onError: (message: string) => void,
): () => void {
  const q = query(
    collection(db, 'predictions'),
    where('userId', '==', userId),
    where('date', '==', date),
  );
  return onSnapshot(
    q,
    (snap) => onChange(snap.size),
    () => onError('Günlük tahmin sayısı yüklenemedi.'),
  );
}
