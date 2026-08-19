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

/** Bugünün ay anahtarını döner (ör. "2026-08"). */
export function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Verilen ay anahtarından bir ay öncesinin/sonrasının anahtarını hesaplar (ay seçicide ileri/geri gitmek için). */
export function shiftMonthKey(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** Bir ay anahtarını ("2026-08") Türkçe okunur hale getirir ("Ağustos 2026"). */
export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
}

/**
 * Haftalık/aylık liderlik tablosunu getirir. ÖNEMLİ: Bu hesaplama artık
 * istemci tarafında YAPILMAZ - otomasyon script'i (automation/check-results.js)
 * bunu arka planda her ~6 saatte bir hesaplayıp `leaderboardCache/{docId}`
 * dokümanına yazıyor; burada sadece o hazır dokümanı TEK bir okuma ile
 * çekiyoruz.
 *
 * ÖNEMLİ (ay geçmişi): 'week' için hep aynı dokümana ('week') bakılır -
 * sadece güncel hafta tutulur. 'month' için ise her ay KENDİ dokümanına
 * yazılır (ör. 'month_2026-08') ve bir sonraki ay bunun ÜZERİNE YAZMAZ -
 * bu sayede geçmiş aylara (ödül vermek için) bakılabilir. `monthKey`
 * verilmezse bugünün ayı kullanılır.
 */
export async function getPeriodLeaderboard(
  period: LeaderboardPeriod,
  monthKey?: string,
): Promise<UserProfile[]> {
  const docId = period === 'week' ? 'week' : `month_${monthKey ?? getCurrentMonthKey()}`;
  const snap = await getDoc(doc(db, 'leaderboardCache', docId));
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
    xp: 0,
    level: 1,
    createdAt: '',
    updatedAt: '',
  }));
}

/**
 * "Genel" (tüm-zamanlar, XP'ye göre) liderlik tablosunu getirir. ÖNEMLİ
 * (KOTA TASARRUFU): Bu sekme önceden istemci tarafında `users`
 * koleksiyonunu CANLI dinleyerek çalışıyordu - kullanıcı sayısı arttıkça
 * maliyeti doğrusal olarak büyüyen bir tasarımdı. Artık haftalık/aylık ile
 * aynı desende: otomasyon bunu birkaç saatte bir hesaplayıp
 * `leaderboardCache/all` dokümanına yazıyor, burada TEK bir okuma ile
 * çekiliyor. Bedel: liste artık ANLIK değil, birkaç saate kadar gecikmeli
 * güncellenebilir (kabul edilebilir bir takas).
 */
export async function getAllTimeLeaderboard(): Promise<UserProfile[]> {
  const snap = await getDoc(doc(db, 'leaderboardCache', 'all'));
  if (!snap.exists()) return [];

  const entries = (snap.data().entries as (CachedEntry & { bestStreak: number; xp: number })[]) ?? [];
  return entries.map((e) => ({
    uid: e.uid,
    email: '',
    displayName: e.displayName,
    currentStreak: 0,
    bestStreak: e.bestStreak,
    totalPredictions: e.totalPredictions,
    correctPredictions: e.correctPredictions,
    badges: e.badges ?? [],
    isAdmin: false,
    avatarUrl: e.avatarUrl,
    xp: e.xp,
    level: 1,
    createdAt: '',
    updatedAt: '',
  }));
}
