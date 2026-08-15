import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  getDoc,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { createNotification } from '@/services/notificationCenterService';
import type { Duel, DuelStatus, Match, PredictionChoice } from '@/types';

function mapDuelDoc(id: string, data: Record<string, unknown>): Duel {
  function toIso(v: unknown): string | null {
    if (!v) return null;
    return v instanceof Timestamp ? v.toDate().toISOString() : (v as string);
  }
  return {
    id,
    challengerUid: data.challengerUid as string,
    challengerDisplayName: data.challengerDisplayName as string,
    challengerAvatarUrl: (data.challengerAvatarUrl as string) || null,
    opponentUid: data.opponentUid as string,
    opponentDisplayName: data.opponentDisplayName as string,
    opponentAvatarUrl: (data.opponentAvatarUrl as string) || null,
    matchIds: (data.matchIds as string[]) ?? [],
    status: data.status as DuelStatus,
    // ÖNEMLİ: Düello seçimleri (challengerPicks/opponentPicks) normal
    // `predictions` koleksiyonundan TAMAMEN AYRI - düellonun kendi
    // dokümanının içinde saklanır. Bu, günlük tahmin havuzuyla karışmasını
    // VE seri/XP hesaplamasını etkilemesini engeller (bkz. aşağıdaki
    // submitDuelPick - normal submitPrediction'ı ASLA çağırmaz).
    challengerPicks: (data.challengerPicks as Record<string, PredictionChoice>) ?? {},
    opponentPicks: (data.opponentPicks as Record<string, PredictionChoice>) ?? {},
    challengerScore: (data.challengerScore as number) ?? null,
    opponentScore: (data.opponentScore as number) ?? null,
    winnerUid: (data.winnerUid as string) || null,
    createdAt: toIso(data.createdAt) ?? '',
    respondedAt: toIso(data.respondedAt),
    completedAt: toIso(data.completedAt),
  };
}

/**
 * Bir arkadaşa düello daveti gönderir - TAM OLARAK 5 maç ile. Karşı tarafa
 * bildirim düşer (bkz. notificationCenterService.ts). Sonuç hesaplaması
 * (challengerScore/opponentScore/winnerUid) burada YAPILMAZ - o, otomasyon
 * script'i tarafından, 5 maçın hepsi sonuçlandığında hesaplanır (bkz.
 * check-results.js'deki resolveDuels fonksiyonu, artık challengerPicks/
 * opponentPicks alanlarını karşılaştırıyor - normal predictions koleksiyonuna
 * hiç bakmıyor).
 */
export async function createDuel(
  challengerUid: string,
  challengerDisplayName: string,
  challengerAvatarUrl: string | null,
  opponentUid: string,
  opponentDisplayName: string,
  opponentAvatarUrl: string | null,
  matchIds: string[],
): Promise<void> {
  if (matchIds.length !== 5) throw new Error('Düello tam olarak 5 maç içermeli.');
  if (challengerUid === opponentUid) throw new Error('Kendine düello gönderemezsin.');

  const docRef = await addDoc(collection(db, 'duels'), {
    challengerUid,
    challengerDisplayName,
    challengerAvatarUrl,
    opponentUid,
    opponentDisplayName,
    opponentAvatarUrl,
    matchIds,
    status: 'pending',
    challengerPicks: {},
    opponentPicks: {},
    challengerScore: null,
    opponentScore: null,
    winnerUid: null,
    createdAt: Timestamp.now(),
    respondedAt: null,
    completedAt: null,
  });

  await createNotification(
    opponentUid,
    'duel',
    '⚔️ Yeni Düello Daveti!',
    `${challengerDisplayName} seni 5 maçlık bir tahmin düellosuna davet etti.`,
    `/duello/${docRef.id}`,
  ).catch(() => {});
}

/** Düello davetini kabul eder ya da reddeder. Sadece rakip (opponentUid) çağırabilir. */
export async function respondToDuel(
  duelId: string,
  accept: boolean,
  responderDisplayName: string,
  challengerUid: string,
): Promise<void> {
  await updateDoc(doc(db, 'duels', duelId), {
    status: accept ? 'accepted' : 'declined',
    respondedAt: Timestamp.now(),
  });

  await createNotification(
    challengerUid,
    'duel',
    accept ? '✅ Düello Kabul Edildi!' : '❌ Düello Reddedildi',
    accept
      ? `${responderDisplayName} düello davetini kabul etti. Bol şans!`
      : `${responderDisplayName} düello davetini reddetti.`,
    `/duello/${duelId}`,
  ).catch(() => {});
}

/**
 * Kabul edilmiş bir düellodaki bir maça, KENDİ (challengerPicks ya da
 * opponentPicks) alanına seçim yazar - normal `predictions` koleksiyonuna
 * ASLA dokunmaz. Bu yüzden düello tahminleri günlük tahmin hakkını
 * tüketmez, seriye dahil olmaz ve XP kazandırmaz - tamamen düellonun
 * kendi içinde kalır.
 */
export async function submitDuelPick(
  duelId: string,
  matchId: string,
  choice: PredictionChoice,
  isChallenger: boolean,
): Promise<void> {
  const duelRef = doc(db, 'duels', duelId);
  const duelSnap = await getDoc(duelRef);
  const existing = duelSnap.data();
  const field = isChallenger ? 'challengerPicks' : 'opponentPicks';
  const currentPicks = (existing?.[field] as Record<string, PredictionChoice>) ?? {};

  await updateDoc(duelRef, {
    [field]: { ...currentPicks, [matchId]: choice },
  });
}

/**
 * Kullanıcının TÜM düellolarını (gönderdiği + aldığı, en yeniden en eskiye)
 * gerçek zamanlı dinler. ÖNEMLİ: Firestore sorgusunda BİLEREK `orderBy`
 * kullanılmıyor - `where` + farklı bir alanda `orderBy` kombinasyonu,
 * Firebase Console'da elle oluşturulması gereken bir "bileşik indeks"
 * gerektirir; bu indeks oluşturulmadan sorgu sessizce başarısız olabiliyordu
 * (düellolar var olduğu halde sayfada hiç görünmeme sorununun kök nedeni
 * buydu). Sıralama zaten aşağıdaki emit() içinde JavaScript tarafında
 * yapılıyor, bu yüzden orderBy'a hiç gerek yok.
 */
export function subscribeMyDuels(
  uid: string,
  onChange: (duels: Duel[]) => void,
  onError: (message: string) => void,
): () => void {
  const asChallenger = query(collection(db, 'duels'), where('challengerUid', '==', uid));
  const asOpponent = query(collection(db, 'duels'), where('opponentUid', '==', uid));

  let challengerDuels: Duel[] = [];
  let opponentDuels: Duel[] = [];

  function emit() {
    const merged = [...challengerDuels, ...opponentDuels].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    onChange(merged);
  }

  const unsub1 = onSnapshot(
    asChallenger,
    (snap) => {
      challengerDuels = snap.docs.map((d) => mapDuelDoc(d.id, d.data()));
      emit();
    },
    () => onError('Düellolar yüklenemedi.'),
  );
  const unsub2 = onSnapshot(
    asOpponent,
    (snap) => {
      opponentDuels = snap.docs.map((d) => mapDuelDoc(d.id, d.data()));
      emit();
    },
    () => onError('Düellolar yüklenemedi.'),
  );

  return () => {
    unsub1();
    unsub2();
  };
}

/** Tek bir düelloyu (detay sayfası için) gerçek zamanlı dinler. */
export function subscribeDuel(
  duelId: string,
  onChange: (duel: Duel | null) => void,
  onError: (message: string) => void,
): () => void {
  return onSnapshot(
    doc(db, 'duels', duelId),
    (snap) => onChange(snap.exists() ? mapDuelDoc(snap.id, snap.data()) : null),
    () => onError('Düello yüklenemedi.'),
  );
}

/**
 * Verilen maç ID'lerinin TAM maç nesnelerini (Match tipiyle birebir) tek
 * seferde çeker (düello detay sayfasında maçları göstermek için). Firestore'un
 * `in` sorgusu en fazla 10 ID kabul eder - düellolarda zaten sabit 5 maç
 * olduğu için bu limit hiç sorun yaratmaz.
 */
export async function getMatchesByIds(matchIds: string[]): Promise<Record<string, Match>> {
  if (matchIds.length === 0) return {};
  const snap = await getDocs(query(collection(db, 'matches'), where('__name__', 'in', matchIds)));
  const result: Record<string, Match> = {};
  snap.docs.forEach((d) => {
    const data = d.data();
    result[d.id] = {
      id: d.id,
      date: data.date,
      dayOrder: data.dayOrder,
      globalOrder: data.globalOrder,
      homeTeam: data.homeTeam,
      awayTeam: data.awayTeam,
      homeTeamLogo: data.homeTeamLogo,
      awayTeamLogo: data.awayTeamLogo,
      league: data.league,
      kickoffAt: data.kickoffAt,
      result: data.result ?? null,
      homeGoals: data.homeGoals ?? null,
      awayGoals: data.awayGoals ?? null,
      liveScore: data.liveScore ?? null,
      createdAt: data.createdAt,
    };
  });
  return result;
}
