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

  async function watchAdForCredit() {
    if (!uid || !canEarnMore) return;
    setIsEarning(true);
    setError(null);
    try {
      await earnBonusCredit(uid, date);
    } catch {
      setError('Hak eklenemedi, tekrar dene.');
    } finally {
      setIsEarning(false);
    }
  }

  return { used, bonusCredits, allowed, remaining, canEarnMore, loading, error, isEarning, watchAdForCredit };
}
