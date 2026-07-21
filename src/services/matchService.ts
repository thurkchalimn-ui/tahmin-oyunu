import {
  collection,
  addDoc,
  doc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit as fbLimit,
  getDocs,
  documentId,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Match, PredictionChoice } from '@/types';
import { recalculateUserStreak } from '@/services/userService';

function mapMatchDoc(id: string, data: Record<string, unknown>): Match {
  const toIso = (v: unknown) => (v instanceof Timestamp ? v.toDate().toISOString() : (v as string) ?? '');
  return {
    id,
    date: data.date as string,
    dayOrder: data.dayOrder as number,
    globalOrder: data.globalOrder as number,
    homeTeam: data.homeTeam as string,
    awayTeam: data.awayTeam as string,
    homeTeamLogo: (data.homeTeamLogo as string) || undefined,
    awayTeamLogo: (data.awayTeamLogo as string) || undefined,
    league: (data.league as string) ?? '',
    kickoffAt: toIso(data.kickoffAt),
    result: (data.result as PredictionChoice) ?? null,
    liveScore: (data.liveScore as Match['liveScore']) ?? null,
    createdAt: toIso(data.createdAt),
  };
}

/** Sıradaki global kronolojik sıra numarasını hesaplar (seri hesaplaması bu sıraya göre yapılır). */
async function getNextGlobalOrder(): Promise<number> {
  const q = query(collection(db, 'matches'), orderBy('globalOrder', 'desc'), fbLimit(1));
  const snap = await getDocs(q);
  if (snap.empty) return 1;
  return (snap.docs[0].data().globalOrder as number) + 1;
}

export interface NewMatchInput {
  date: string;
  dayOrder: number;
  homeTeam: string;
  awayTeam: string;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
  league?: string;
  kickoffAt: string; // ISO string
}

/** Admin: yeni bir maç ekler (günlük kupona). */
export async function createMatch(input: NewMatchInput): Promise<void> {
  const globalOrder = await getNextGlobalOrder();
  await addDoc(collection(db, 'matches'), {
    ...input,
    globalOrder,
    result: null,
    createdAt: Timestamp.now(),
  });
}

/**
 * Admin: mevcut bir maçın bilgilerini günceller (takım adı, logo, lig, saat vb.).
 * `date` ve `dayOrder` kasıtlı olarak buradan değiştirilemez, çünkü globalOrder ve
 * dolayısıyla seri hesaplaması bunlara dayanır - yanlışlıkla bozulmalarını önler.
 */
export async function updateMatch(
  matchId: string,
  updates: Partial<Omit<NewMatchInput, 'date' | 'dayOrder'>>,
): Promise<void> {
  await updateDoc(doc(db, 'matches', matchId), updates);
}

/**
 * Verilen maç ID'lerine karşılık gelen maçları toplu olarak getirir.
 * Bir oyuncunun tahmin geçmişini, ilgili maç bilgileriyle (takım adları vb.)
 * birlikte göstermek için kullanılır. Firestore 'in' sorgusu en fazla 30 değer
 * kabul ettiği için liste 30'arlık parçalara bölünür.
 */
export async function getMatchesByIds(matchIds: string[]): Promise<Match[]> {
  const uniqueIds = Array.from(new Set(matchIds));
  if (uniqueIds.length === 0) return [];

  const chunks: string[][] = [];
  for (let i = 0; i < uniqueIds.length; i += 30) {
    chunks.push(uniqueIds.slice(i, i + 30));
  }

  const chunkResults = await Promise.all(
    chunks.map(async (chunk) => {
      const q = query(collection(db, 'matches'), where(documentId(), 'in', chunk));
      const snap = await getDocs(q);
      return snap.docs.map((d) => mapMatchDoc(d.id, d.data()));
    }),
  );
  return chunkResults.flat();
}

/** Belirli bir güne ait maçları gerçek zamanlı dinler (sıraya göre). */
export function subscribeMatchesByDate(
  date: string,
  onChange: (matches: Match[]) => void,
  onError: (message: string) => void,
): () => void {
  // Not: Burada bilinçli olarak orderBy kullanılmıyor. `where('date', ...)` ile
  // farklı bir alanda `orderBy` birleştirmek Firestore'da composite index
  // gerektirir (Firebase Console'da manuel oluşturulması gerekir). Günde en
  // fazla 20 maç olacağı için sıralamayı burada, istemci tarafında yapmak
  // hem index derdini ortadan kaldırıyor hem de performans açısından sorun teşkil etmiyor.
  const q = query(collection(db, 'matches'), where('date', '==', date));
  return onSnapshot(
    q,
    (snap) => {
      const matches = snap.docs.map((d) => mapMatchDoc(d.id, d.data()));
      matches.sort((a, b) => a.dayOrder - b.dayOrder);
      onChange(matches);
    },
    (error) => {
      // eslint-disable-next-line no-console
      console.error('[matchService] subscribeMatchesByDate hatası:', error);
      onError('Maçlar yüklenemedi.');
    },
  );
}

/**
 * Admin: bir maçın sonucunu girer. Bu maça ait tüm tahminlerin doğruluğunu
 * günceller ve etkilenen her kullanıcının serisini yeniden hesaplatır.
 */
export async function setMatchResult(matchId: string, result: PredictionChoice): Promise<void> {
  await updateDoc(doc(db, 'matches', matchId), { result });

  const predSnap = await getDocs(query(collection(db, 'predictions'), where('matchId', '==', matchId)));

  const affectedUserIds = new Set<string>();
  await Promise.all(
    predSnap.docs.map(async (predDoc) => {
      const data = predDoc.data();
      const isCorrect = data.choice === result;
      affectedUserIds.add(data.userId as string);
      await updateDoc(doc(db, 'predictions', predDoc.id), { isCorrect });
    }),
  );

  // Her etkilenen kullanıcı için seriyi yeniden hesapla (sıralı, race condition'ı azaltmak için)
  for (const uid of affectedUserIds) {
    await recalculateUserStreak(uid);
  }
}
