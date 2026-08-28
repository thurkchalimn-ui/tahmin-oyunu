import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ADSENSE_CLIENT_ID = 'ca-pub-4349493488605502';
const SCRIPT_ID = 'adsense-auto-ads-script';

/**
 * Reklamların gösterilmesine izin verilen, GERÇEK içerik barındıran
 * sayfalar. Admin paneli, giriş/kayıt, düello/lig yönetimi, profil/rozet
 * gibi "içerik değil, gezinme/davranışsal amaçlı" ekranlar KASITLI olarak
 * dışarıda bırakıldı - AdSense'in "Yayıncı içeriği olmayan ekranlarda
 * gösterilen reklamlar" politika ihlalini önlemek için (bkz. AdSense
 * Politika Merkezi uyarısı, Ağustos 2026).
 */
function isContentPage(pathname: string): boolean {
  if (pathname === '/') return true;
  if (pathname === '/maclar') return true;
  if (pathname === '/liderlik') return true;
  if (pathname === '/nasil-oynanir') return true;
  // Oyuncu profili genel/herkese açık gerçek içerik - ama rozet alt
  // sayfası (ör. /oyuncu/xxx/rozetler) daha ince/az içerikli, dışarıda
  // bırakılıyor.
  if (pathname.startsWith('/oyuncu/') && !pathname.endsWith('/rozetler')) return true;
  return false;
}

/**
 * Google AdSense (Otomatik Reklamlar) script'ini SADECE yukarıdaki gerçek
 * içerik sayfalarında yükler. Önceden bu script `index.html`'de TÜM
 * sayfalarda (admin paneli, giriş/kayıt ekranları dahil) sabit olarak
 * yükleniyordu - AdSense bunu politika ihlali olarak işaretledi. Sayfa
 * değiştikçe (SPA içi geçişlerde), gerekirse script eklenir/kaldırılır.
 */
export function AdSenseScriptLoader() {
  const { pathname } = useLocation();

  useEffect(() => {
    const shouldLoad = isContentPage(pathname);
    const existing = document.getElementById(SCRIPT_ID);

    if (shouldLoad && !existing) {
      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.async = true;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    } else if (!shouldLoad && existing) {
      existing.remove();
    }
  }, [pathname]);

  return null;
}
