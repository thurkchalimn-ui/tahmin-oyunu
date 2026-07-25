import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { UserProfile } from '@/types';

export type LeaderboardPeriod = 'week' | 'month';

interface CachedEntry {
  uid: string;
  displayName: string;
  avatarUrl: string | null;
  badges: UserProfile['badges'];
  totalPredictions: number;
  correctPredictions: number;
}

/**
 * Haftalık/aylık liderlik tablosunu getirir. ÖNEMLİ: Bu hesaplama artık
 * istemci tarafında YAPILMAZ - otomasyon script'i (automation/check-results.js)
 * bunu arka planda her ~6 saatte bir hesaplayıp `leaderboardCache/{period}`
 * dokümanına yazıyor; burada sadece o hazır dokümanı TEK bir okuma ile
 * çekiyoruz. Bu, önceki (her sayfa açılışında onlarca sorgu yapan) yönteme
 * göre Firestore okuma kotasını ciddi şekilde azaltır.
 */
export async function getPeriodLeaderboard(period: LeaderboardPeriod): Promise<UserProfile[]> {
  const snap = await getDoc(doc(db, 'leaderboardCache', period));
  if (!snap.exists()) return [];

  const entries = (snap.data().entries as CachedEntry[]) ?? [];
  return entries.map((e) => ({
    uid: e.uid,
    email: '',
    displayName: e.displayName,
    currentStreak: 0,
    bestStreak: 0,
    totalPredictions: e.totalPredictions,
    correctPredictions: e.correctPredictions,
    badges: e.badges ?? [],
    isAdmin: false,
    avatarUrl: e.avatarUrl,
    createdAt: '',
    updatedAt: '',
  }));
}
