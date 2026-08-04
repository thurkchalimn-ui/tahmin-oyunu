import { collection, query, orderBy, limit, getDocs, getCountFromServer, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Match } from '@/types';

/**
 * Sonuçlanmış (result dolu) en son birkaç maçı getirir. Ana sayfadaki "Son
 * Maç Sonuçları" önizlemesi için kullanılır.
 *
 * ÖNEMLİ: Bilinçli olarak `where('result', ...)` ile filtrelemiyoruz - bu,
 * `orderBy` ile birleşince YENİ bir Firestore composite index gerektirirdi
 * (daha önce bu yüzden haftalarca süren bir üretim sorunu yaşadık). Onun
 * yerine, sadece TEK alanlı (otomatik index'li) bir sorguyla en yeni maçları
 * çekip sonuçlanmış olanları İSTEMCİ TARAFINDA filtreliyoruz.
 *
 * SIRALAMA/ADAY HAVUZU: Önceden aday havuzu `kickoffAt`'a göre çekiliyordu -
 * ama gerçek hedef sıralama (`date` + `dayOrder`, "Tüm Tahminlerim" ile
 * aynı) `kickoffAt` ile tam örtüşmeyebiliyordu (ör. aynı gün için maçlar
 * kickoff saatinden farklı bir sırayla eklenmiş olabilir) - bu da bazen
 * gerçek "ilk N" içindeki bir maçın 30'luk kickoffAt havuzunun dışında
 * kalıp hiç görünmemesine yol açıyordu. Artık aday havuzu doğrudan `date`
 * alanına göre (hedef sıralamanın BİRİNCİL alanı) çekiliyor - bu, doğru
 * adayları çok daha güvenilir şekilde yakalar.
 */
export async function getRecentResults(count: number): Promise<Match[]> {
  const q = query(collection(db, 'matches'), orderBy('date', 'desc'), limit(40));
  const snap = await getDocs(q);
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Match);
  const resolved = all.filter((m) => m.result !== null);
  resolved.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return b.dayOrder - a.dayOrder;
  });
  return resolved.slice(0, count);
}

/**
 * Kullanıcının tüm-zamanlar doğru tahmin sayısına göre yaklaşık genel
 * sıralamasını hesaplar (kendinden daha çok doğru tahmini olan kullanıcı
 * sayısı + 1). Liderlik tablosunun tamamını çekmek yerine sadece bir SAYIM
 * sorgusu (getCountFromServer) kullanır - kota dostu.
 */
export async function getUserRank(correctPredictions: number): Promise<number> {
  const snap = await getCountFromServer(
    query(collection(db, 'users'), where('correctPredictions', '>', correctPredictions)),
  );
  return snap.data().count + 1;
}

/**
 * Ana sayfa podyum önizlemesi için tüm-zamanlar en iyi 3 kullanıcıyı getirir.
 * Haftalık liderlik verisi henüz yeterli olmadığında (ör. hafta yeni
 * başladığında) yedek olarak kullanılır. Minimal bir alan seti döner - bu
 * önizleme sadece uid/avatarUrl/displayName/correctPredictions kullanıyor.
 */
export async function getAllTimeTopThree(): Promise<
  { uid: string; displayName: string; avatarUrl: string | null; correctPredictions: number }[]
> {
  const snap = await getDocs(
    query(collection(db, 'users'), orderBy('bestStreak', 'desc'), limit(3)),
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      uid: d.id,
      displayName: (data.displayName as string) ?? 'İsimsiz Oyuncu',
      avatarUrl: (data.avatarUrl as string) ?? null,
      correctPredictions: (data.correctPredictions as number) ?? 0,
    };
  });
}
