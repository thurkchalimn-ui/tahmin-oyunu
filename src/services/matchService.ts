import {
  collection,
  addDoc,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
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
import { createNotification } from '@/services/notificationCenterService';

/** Takım adını, tutarlı bir Firestore doküman ID'sine çevirir (küçük harf, boşluk/aksan temizliği). */
function normalizeTeamKey(teamName: string): string {
  return teamName
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

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

/**
 * Bir takımın logosunu `teamLogos` koleksiyonunda kalıcı olarak saklar. Bir
 * maça logo linki girildiğinde (elle ya da otomatik bulunarak) çağrılır -
 * böylece aynı takım bir daha eklendiğinde dışarıya hiç çıkmadan, doğrudan
 * buradan (anında) bulunur.
 */
async function saveTeamLogo(teamName: string, logoUrl: string): Promise<void> {
  const key = normalizeTeamKey(teamName);
  if (!key || !logoUrl) return;
  await setDoc(doc(db, 'teamLogos', key), {
    teamName: teamName.trim(),
    logoUrl,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Bir takımın logosunu bulur. Önce daha önce eklenmiş takımların hafızasına
 * (`teamLogos` koleksiyonu) bakar - bulursa anında, internete hiç çıkmadan döner.
 * Orada yoksa TheSportsDB'nin herkese açık test anahtarı ("3", gizli olmayan
 * genel bir demo anahtarıdır) ile dışarıdan arar; bulursa sonucu hafızaya da
 * kaydeder ki bir sonraki sefer tekrar dışarı çıkmasın.
 */
export async function getTeamLogoByName(teamName: string): Promise<string | null> {
  const trimmed = teamName.trim();
  if (!trimmed) return null;

  const key = normalizeTeamKey(trimmed);
  const cachedSnap = await getDoc(doc(db, 'teamLogos', key));
  if (cachedSnap.exists()) {
    return (cachedSnap.data().logoUrl as string) ?? null;
  }

  try {
    const res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(trimmed)}`,
    );
    if (!res.ok) return null;
    const json = await res.json();
    const team = json?.teams?.[0];
    const logoUrl = team?.strTeamBadge ?? null;
    if (logoUrl) await saveTeamLogo(trimmed, logoUrl);
    return logoUrl;
  } catch {
    return null;
  }
}

/**
 * Admin: yeni bir maç ekler (günlük kupona).
 * ÖNEMLİ (BUG DÜZELTMESİ): Firestore, bir alanın değeri `undefined` ise
 * `addDoc`'u TAMAMEN reddediyor (hata fırlatıyor) - `null` kabul ediyor ama
 * `undefined` değil. `input` içindeki opsiyonel alanlar (homeTeamLogo,
 * awayTeamLogo, league) bazen `undefined` olarak geliyor - özellikle
 * "Maçları Otomatik Çek" akışında, bir takımın logosu bulunamadığında. Bu
 * yüzden addDoc'a göndermeden önce `undefined` değerli TÜM alanlar
 * (varsa) temizleniyor.
 */
export async function createMatch(input: NewMatchInput): Promise<void> {
  const globalOrder = await getNextGlobalOrder();

  const cleanedInput = Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  );

  await addDoc(collection(db, 'matches'), {
    ...cleanedInput,
    globalOrder,
    result: null,
    reminderSent: false, // Otomasyon script'i "30 dakika kala" bildirimini gönderince true yapar
    createdAt: Timestamp.now(),
  });

  // Girilen logoları (elle yapıştırılmış olsa bile) hafızaya kaydet - aynı
  // takım bir daha eklendiğinde otomatik doldurulabilsin.
  if (input.homeTeamLogo) await saveTeamLogo(input.homeTeam, input.homeTeamLogo);
  if (input.awayTeamLogo) await saveTeamLogo(input.awayTeam, input.awayTeamLogo);
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
  const cleanedUpdates = Object.fromEntries(
    Object.entries(updates).filter(([, value]) => value !== undefined),
  );
  await updateDoc(doc(db, 'matches', matchId), cleanedUpdates);

  if (updates.homeTeam && updates.homeTeamLogo) await saveTeamLogo(updates.homeTeam, updates.homeTeamLogo);
  if (updates.awayTeam && updates.awayTeamLogo) await saveTeamLogo(updates.awayTeam, updates.awayTeamLogo);
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
  // fazla 20 maç olacağı için sıralamayı burada, istemci tarafında (gerçek
  // başlama saatine - kickoffAt - göre, admin panelinde eklenme sırasına göre
  // DEĞİL) yapmak hem index derdini ortadan kaldırıyor hem de performans
  // açısından sorun teşkil etmiyor.
  const q = query(collection(db, 'matches'), where('date', '==', date));
  return onSnapshot(
    q,
    (snap) => {
      const matches = snap.docs.map((d) => mapMatchDoc(d.id, d.data()));
      matches.sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());
      onChange(matches);
    },
    (error) => {
      // eslint-disable-next-line no-console
      console.error('[matchService] subscribeMatchesByDate hatası:', error);
      onError('Maçlar yüklenemedi.');
    },
  );
}

/** Skordan (ör. 2-1) otomatik olarak 1/X/2 sonucunu hesaplar. */
function computeResultFromScore(homeGoals: number, awayGoals: number): PredictionChoice {
  if (homeGoals > awayGoals) return 'HOME';
  if (homeGoals < awayGoals) return 'AWAY';
  return 'DRAW';
}

/**
 * Admin: bir maçın KESİN SKORUNU girer (ör. 2-1). Sistem bundan otomatik
 * olarak 1/X/2 sonucunu hesaplar - tahminler bu hesaplanan sonuca göre
 * değerlendirilir. Gerçek skor, maçın `liveScore` alanına da yazılır (status:
 * 'FINISHED') - böylece "Son Maç Sonuçları" gibi skoru gösteren yerler bunu
 * otomatik olarak kullanır, ayrı bir alan/geçiş gerekmez.
 *
 * ÖNEMLİ: İstemci (tarayıcı) başka bir kullanıcıya doğrudan push bildirimi
 * gönderemez - bu yüzden burada sadece `notificationQueue` koleksiyonuna bir
 * "gönderilmesi gereken bildirim" kaydı bırakılır. Gerçek gönderim, Admin SDK'ya
 * sahip olan GitHub Actions otomasyon script'i (automation/check-results.js)
 * tarafından, her çalıştığında bu kuyruğu okuyup temizleyerek yapılır.
 */
export async function setMatchResult(matchId: string, homeGoals: number, awayGoals: number): Promise<void> {
  const result = computeResultFromScore(homeGoals, awayGoals);

  const matchSnap = await getDoc(doc(db, 'matches', matchId));
  const matchData = matchSnap.data();
  const matchLabel = matchData ? `${matchData.homeTeam} vs ${matchData.awayTeam}` : 'Maç';

  await updateDoc(doc(db, 'matches', matchId), {
    result,
    liveScore: { homeGoals, awayGoals, status: 'FINISHED', minute: null },
  });

  const predSnap = await getDocs(query(collection(db, 'predictions'), where('matchId', '==', matchId)));

  const affectedUserIds = new Set<string>();
  await Promise.all(
    predSnap.docs.map(async (predDoc) => {
      const data = predDoc.data();
      const isCorrect = data.choice === result;
      affectedUserIds.add(data.userId as string);
      await updateDoc(doc(db, 'predictions', predDoc.id), { isCorrect, resolvedAt: Timestamp.now() });
      await addDoc(collection(db, 'notificationQueue'), {
        userId: data.userId,
        title: isCorrect ? '✅ Doğru Tahmin!' : '❌ Yanlış Tahmin',
        body: `${matchLabel} maçı ${homeGoals}-${awayGoals} bitti.`,
        type: 'result', // Otomasyon script'i, kullanıcının bu türü kapatıp kapatmadığını kontrol eder
        createdAt: Timestamp.now(),
      });
      // Uygulama içi bildirim merkezi (zil ikonu) - notificationQueue'dan
      // AYRI, kalıcı bir bildirim geçmişi (bkz. notificationCenterService.ts).
      await createNotification(
        data.userId as string,
        'result',
        isCorrect ? '✅ Doğru Tahmin!' : '❌ Yanlış Tahmin',
        `${matchLabel} maçı ${homeGoals}-${awayGoals} bitti.`,
        '/maclar',
      ).catch(() => {});
    }),
  );

  // Her etkilenen kullanıcı için seriyi yeniden hesapla (sıralı, race condition'ı azaltmak için)
  for (const uid of affectedUserIds) {
    await recalculateUserStreak(uid);
  }
}

/**
 * Admin: yanlışlıkla girilmiş bir maç sonucunu geri alır. Maçı yeniden
 * "sonuçlanmamış" durumuna döndürür (skor dahil), bu maça ait tüm tahminlerin
 * doğru/yanlış damgasını temizler ve etkilenen kullanıcıların serilerini bu
 * değişikliği yansıtacak şekilde yeniden hesaplar.
 */
export async function undoMatchResult(matchId: string): Promise<void> {
  await updateDoc(doc(db, 'matches', matchId), { result: null, liveScore: null });

  const predSnap = await getDocs(query(collection(db, 'predictions'), where('matchId', '==', matchId)));

  const affectedUserIds = new Set<string>();
  await Promise.all(
    predSnap.docs.map(async (predDoc) => {
      const data = predDoc.data();
      affectedUserIds.add(data.userId as string);
      await updateDoc(doc(db, 'predictions', predDoc.id), { isCorrect: null, resolvedAt: null });
    }),
  );

  for (const uid of affectedUserIds) {
    await recalculateUserStreak(uid);
  }
}

/**
 * Admin: bir maçı KALICI OLARAK siler - genelde yanlışlıkla eklenmiş/
 * kopya bir maçı temizlemek için kullanılır. Bu maça ait TÜM tahminler de
 * silinir (aksi halde "hayalet" tahminler kalır, başka yerlerde - ör.
 * profil geçmişi - hataya yol açar) ve etkilenen kullanıcıların serileri/XP'si
 * bu değişikliği yansıtacak şekilde yeniden hesaplanır (undoMatchResult ile
 * aynı mantık).
 *
 * ÖNEMLİ: Bu işlem GERİ ALINAMAZ - arayüzde bir onay adımı olması önerilir.
 */
export async function deleteMatch(matchId: string): Promise<void> {
  const predSnap = await getDocs(query(collection(db, 'predictions'), where('matchId', '==', matchId)));

  const affectedUserIds = new Set<string>();
  await Promise.all(
    predSnap.docs.map(async (predDoc) => {
      affectedUserIds.add(predDoc.data().userId as string);
      await deleteDoc(predDoc.ref);
    }),
  );

  await deleteDoc(doc(db, 'matches', matchId));

  for (const uid of affectedUserIds) {
    await recalculateUserStreak(uid);
  }
}
