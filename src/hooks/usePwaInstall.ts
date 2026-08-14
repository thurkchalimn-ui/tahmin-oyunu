import { useEffect, useState } from 'react';

/** Chrome/Android'in native kurulum isteğini (beforeinstallprompt) temsil eder. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Platform = 'ios' | 'android-chrome' | 'other';

/**
 * PWA kurulum durumunu (platform, zaten kurulu mu, kurulum istemi hazır mı)
 * yönetir. ÖNEMLİ: iOS Safari, `beforeinstallprompt` API'sini HİÇ desteklemiyor
 * (Apple'ın kasıtlı bir kısıtlaması) - bu yüzden iOS'ta OTOMATİK bir kurulum
 * penceresi açmak teknik olarak imkansız. iOS'ta yapabileceğimiz tek şey,
 * kullanıcıya "Paylaş → Ana Ekrana Ekle" adımlarını gösteren bir talimat
 * banner'ı sunmak.
 */
export function usePwaInstall() {
  const [platform, setPlatform] = useState<Platform>('other');
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Zaten "Ana Ekrana Eklenmiş" (standalone) modda mı çalışıyoruz?
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    const ua = window.navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    const isAndroidChrome = /Android/.test(ua) && /Chrome/.test(ua) && !/Edg|OPR|SamsungBrowser/.test(ua);
    setPlatform(isIOS ? 'ios' : isAndroidChrome ? 'android-chrome' : 'other');

    // Kullanıcı kalıcı olarak kapattıysa (aynı gün içinde 10 kez X'e bastıysa)
    // bir daha HİÇ gösterme. Aksi halde, son kapatmadan bu yana 7 gün
    // geçmediyse geçici olarak gösterme.
    const permanentlyDismissed = localStorage.getItem('pwaInstallPermanentlyDismissed') === 'true';
    const dismissedAt = localStorage.getItem('pwaInstallDismissedAt');
    const recentlyDismissed = dismissedAt && Date.now() - Number(dismissedAt) < 7 * 24 * 60 * 60 * 1000;
    setDismissed(permanentlyDismissed || Boolean(recentlyDismissed));

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  /** Android/Chrome: native kurulum penceresini açar (gerçek otomatik kurulum). */
  async function promptInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  function dismiss() {
    const todayKey = new Date().toISOString().slice(0, 10);
    const lastDismissDay = localStorage.getItem('pwaInstallDismissDay');
    const countToday = lastDismissDay === todayKey ? Number(localStorage.getItem('pwaInstallDismissCount') ?? '0') + 1 : 1;

    localStorage.setItem('pwaInstallDismissDay', todayKey);
    localStorage.setItem('pwaInstallDismissCount', String(countToday));
    localStorage.setItem('pwaInstallDismissedAt', String(Date.now()));

    // Aynı gün içinde 10 kez kapatıldıysa - bu kullanıcı açıkça istemiyor,
    // bir daha HİÇ gösterme (7 günlük geçici bekleme yerine kalıcı gizleme).
    if (countToday >= 10) {
      localStorage.setItem('pwaInstallPermanentlyDismissed', 'true');
    }

    setDismissed(true);
  }

  // Banner ne zaman gösterilsin: standalone değilse, daha önce kapatılmadıysa,
  // VE (Android'de kurulum istemi hazırsa YA DA iOS'taysak - iOS'ta zaten
  // deferredPrompt hiç gelmeyecek, ama yine de talimat banner'ı gösterilmeli)
  const shouldShow = !isStandalone && !dismissed && (platform === 'ios' || (platform === 'android-chrome' && !!deferredPrompt));

  return { platform, isStandalone, shouldShow, promptInstall, dismiss, canAutoInstall: !!deferredPrompt };
}
