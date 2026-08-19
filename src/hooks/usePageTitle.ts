import { useEffect } from 'react';

/**
 * Sayfa başlığını (tarayıcı sekmesindeki + Google'ın arama sonuçlarında
 * gösterdiği <title>) ayarlar. Her sayfa bileşeninin en başında tek satır
 * çağrılır - ör. `usePageTitle('Liderlik')`.
 *
 * ÖNEMLİ (SEO): Site tek bir index.html üzerinden çalışan bir SPA olduğu
 * için, önceden TÜM sayfalar aynı statik başlığı paylaşıyordu - bu,
 * Google'a her sayfanın "farklı bir şey" olduğunu anlatmayı zorlaştırıyordu.
 * Artık her sayfa kendi anlamlı başlığını alıyor.
 *
 * Sayfadan ayrılınca (unmount) başlık BİLEREK eski haline döndürülmüyor -
 * bir sonraki sayfa zaten kendi başlığını kendisi ayarlayacağı için buna
 * gerek yok, gereksiz bir "yanıp sönme" de önlenmiş oluyor.
 */
export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} | Tahmin Serisi`;
  }, [title]);
}
