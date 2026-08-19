import { useEffect, useState } from 'react';
import type { UserProfile, AsyncState } from '@/types';
import { getAllTimeLeaderboard } from '@/services/periodLeaderboardService';

/**
 * "Genel" (tüm-zamanlar, XP'ye göre) liderlik tablosunu getirir.
 * ÖNEMLİ (KOTA TASARRUFU): Önceden `users` koleksiyonunu CANLI dinleyen
 * (onSnapshot) bir sorguydu - kullanıcı sayısı arttıkça maliyeti doğrusal
 * olarak büyüyordu. Artık haftalık/aylık liderlik ile aynı desende:
 * otomasyon bunu birkaç saatte bir önceden hesaplayıp tek bir dokümana
 * yazıyor, burada TEK BİR OKUMA ile çekiliyor - maliyet artık kullanıcı
 * sayısından bağımsız (sabit). Bedel: liste artık anlık değil, birkaç
 * saate kadar gecikmeli olabilir.
 */
export function useLeaderboard(): AsyncState<UserProfile[]> {
  const [state, setState] = useState<AsyncState<UserProfile[]>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true }));
    getAllTimeLeaderboard()
      .then((users) => {
        if (!cancelled) setState({ data: users, loading: false, error: null });
      })
      .catch(() => {
        if (!cancelled) setState({ data: null, loading: false, error: 'Liderlik tablosu yüklenemedi.' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
