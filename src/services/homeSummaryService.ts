import { collection, query, orderBy, limit, getDocs, getCountFromServer, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Match } from '@/types';

/**
 * Sonuçlanmış (result dolu) en son birkaç maçı getirir. Ana sayfadaki "Son
 * Maç Sonuçları" önizlemesi için kullanılır.
 *
 * ÖNEMLİ: Bilinçli olarak `where('result', ...)` ile filtrelemiyoruz - bu,
 * `orderBy('kickoffAt')` ile birleşince YENİ bir Firestore composite index
 * gerektirirdi (daha önce bu yüzden haftalarca süren bir üretim sorunu
 * yaşadık). Onun yerine, sadece TEK alanlı (otomatik index'li) bir sorguyla
 * en yeni maçları çekip sonuçlanmış olanları İSTEMCİ TARAFINDA filtreliyoruz.
 * `limit(30)` günlük maç sayısına göre fazlasıyla yeterli bir tampon.
 */
export async function getRecentResults(count: number): Promise<Match[]> {
  const q = query(collection(db, 'matches'), orderBy('kickoffAt', 'desc'), limit(30));
  const snap = await getDocs(q);
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Match);
  return all.filter((m) => m.result !== null).slice(0, count);
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
