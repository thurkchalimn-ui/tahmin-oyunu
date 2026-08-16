import { useEffect, useState } from 'react';
import { subscribeDailyPredictionCount } from '@/services/predictionService';
import {
  subscribeDailyBonusCredits,
  earnBonusCredit,
  BASE_DAILY_PREDICTIONS,
  MAX_BONUS_CREDITS,
} from '@/services/creditsService';

export interface DailyLimitState {
  used: number; // Bugün yapılan tahmin sayısı
  bonusCredits: number; // Reklamla kazanılan ekstra hak sayısı
  allowed: number; // Toplam izin verilen tahmin sayısı (en fazla 20)
  remaining: number; // Kalan tahmin hakkı
  canEarnMore: boolean; // Daha fazla reklam izleyerek hak kazanılabilir mi
  loading: boolean;
  error: string | null;
  isEarning: boolean;
  watchAdForCredit: () => Promise<void>;
}

// AdSense'in web için "Ödüllü Reklam" (Rewarded Ad) API'si - "Ad Placement
// API" olarak biliniyor. adsbygoogle.js (index.html'de zaten yüklü) sayfaya
// eklendiğinde window.adBreak fonksiyonu otomatik olarak kullanılabilir hale
// gelir - ayrıca bir script eklemeye gerek yok. TypeScript bu global
// fonksiyonu tanımıyor, bu yüzden burada bildiriyoruz.
declare global {
  interface Window {
    adBreak?: (config: {
      type: string;
      name?: string;
      beforeReward?: (showAdFn: () => void) => void;
      adViewed?: () => void;
      adDismissed?: () => void;
      adBreakDone?: (info: unknown) => void;
    }) => void;
  }
}

/** Kullanıcının günlük tahmin hakkı durumunu (kullanılan/kalan/bonus) yönetir. */
export function useDailyPredictionLimit(uid: string | undefined, date: string): DailyLimitState {
  const [used, setUsed] = useState(0);
  const [bonusCredits, setBonusCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEarning, setIsEarning] = useState(false);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    let countLoaded = false;
    let creditsLoaded = false;
    const maybeFinishLoading = () => {
      if (countLoaded && creditsLoaded) setLoading(false);
    };

    const unsubscribeCount = subscribeDailyPredictionCount(
      uid,
      date,
      (count) => {
        setUsed(count);
        countLoaded = true;
        maybeFinishLoading();
      },
      (message) => setError(message),
    );
    const unsubscribeCredits = subscribeDailyBonusCredits(
      uid,
      date,
      (credits) => {
        setBonusCredits(credits);
        creditsLoaded = true;
        maybeFinishLoading();
      },
      (message) => setError(message),
    );

    return () => {
      unsubscribeCount();
      unsubscribeCredits();
    };
  }, [uid, date]);

  const allowed = Math.min(20, BASE_DAILY_PREDICTIONS + bonusCredits);
  const remaining = Math.max(0, allowed - used);
  const canEarnMore = bonusCredits < MAX_BONUS_CREDITS;

  /**
   * ÖNEMLİ: Hak, SADECE kullanıcı reklamı gerçekten sonuna kadar izlerse
   * (adViewed callback'i) veriliyor - önceden butona basar basmaz hak
   * veriliyordu, hiç reklam gösterilmiyordu. Artık gerçek bir AdSense
   * Ödüllü Reklamı gösteriliyor; kullanıcı reklamı yarıda kapatırsa
   * (adDismissed) hak verilmiyor. Uygun bir reklam hiç bulunamazsa
   * (doluluk oranı düşükse, ya da bu reklam türü için hesap henüz uygun
   * değilse) adBreakDone'a düşer ve kullanıcıya bilgi verilir.
   */
  async function watchAdForCredit() {
    if (!uid || !canEarnMore) return;

    if (!window.adBreak) {
      setError('Reklam sistemi şu an yüklenemedi, birazdan tekrar dene.');
      return;
    }

    setIsEarning(true);
    setError(null);
    let rewarded = false;

    window.adBreak({
      type: 'reward',
      name: 'daily-prediction-bonus',
      beforeReward: (showAdFn) => {
        // Kullanıcı zaten "Reklam İzle" butonuna basarak isteğini belirtti,
        // bu yüzden ek bir onay ekranı göstermeden doğrudan reklamı açıyoruz.
        showAdFn();
      },
      adViewed: async () => {
        rewarded = true;
        try {
          await earnBonusCredit(uid, date);
        } catch {
          setError('Hak eklenemedi, tekrar dene.');
        } finally {
          setIsEarning(false);
        }
      },
      adDismissed: () => {
        setIsEarning(false);
        setError('Reklamı tamamlamadan kapattın, hak eklenmedi.');
      },
      adBreakDone: () => {
        // Hiç uygun reklam bulunamadıysa (adViewed/adDismissed hiç
        // çağrılmadıysa) buraya düşülür - kullanıcıyı bekletmeyelim.
        if (!rewarded) {
          setIsEarning(false);
        }
      },
    });
  }

  return { used, bonusCredits, allowed, remaining, canEarnMore, loading, error, isEarning, watchAdForCredit };
}
