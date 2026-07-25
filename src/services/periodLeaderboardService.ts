import { collection, query, where, getDocs, documentId } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { UserProfile } from '@/types';
import { toDateKey } from '@/utils/dateUtils';

export type LeaderboardPeriod = 'week' | 'month';

/** İçinde bulunulan haftanın Pazartesi gününü 'YYYY-MM-DD' olarak döner. */
function startOfWeekKey(): string {
  const now = new Date();
  const day = now.getDay(); // 0 = Pazar
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);
  return toDateKey(monday);
}

/** İçinde bulunulan haftadan SONRAKİ Pazartesi'yi 'YYYY-MM-DD' olarak döner (üst sınır - dahil değil). */
function endOfWeekKey(): string {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() - diffToMonday + 7);
  nextMonday.setHours(0, 0, 0, 0);
  return toDateKey(nextMonday);
}

/** İçinde bulunulan ayın 1'ini 'YYYY-MM-DD' olarak döner. */
function startOfMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

/** İçinde bulunulan aydan SONRAKİ ayın 1'ini 'YYYY-MM-DD' olarak döner (üst sınır - dahil değil). */
function endOfMonthKey(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return toDateKey(nextMonth);
}

/**
 * Belirli bir dönem (bu hafta / bu ay) için liderlik tablosunu hesaplar.
 * Ayrı bir "haftalık sayaç" alanı tutmak yerine (ki bunun periyodik olarak
 * sıfırlanması bir Cloud Function gerektirirdi), o döneme ait tüm tahminler
 * anlık olarak okunup kullanıcı bazında gruplanır. Sıralama, dönem içindeki
 * DOĞRU TAHMİN SAYISINA göre yapılır (dönem-özel bir "seri" hesaplanmaz -
 * bu, "Genel" sekmesindeki tüm-zamanlar serisinden farklı bir kavramdır).
 */
export async function getPeriodLeaderboard(period: LeaderboardPeriod): Promise<UserProfile[]> {
  const startKey = period === 'week' ? startOfWeekKey() : startOfMonthKey();
  const endKey = period === 'week' ? endOfWeekKey() : endOfMonthKey();

  const predSnap = await getDocs(
    query(
      collection(db, 'predictions'),
      where('date', '>=', startKey),
      where('date', '<', endKey),
    ),
  );

  const statsByUser = new Map<string, { total: number; correct: number }>();
  predSnap.docs.forEach((d) => {
    const data = d.data();
    if (data.isCorrect !== true && data.isCorrect !== false) return; // sadece sonuçlananlar
    const uid = data.userId as string;
    const entry = statsByUser.get(uid) ?? { total: 0, correct: 0 };
    entry.total += 1;
    if (data.isCorrect === true) entry.correct += 1;
    statsByUser.set(uid, entry);
  });

  const uids = [...statsByUser.keys()];
  if (uids.length === 0) return [];

  // Kullanıcı profillerini (isim, avatar, rozet) toplu çek - 30'arlık gruplar halinde
  const chunks: string[][] = [];
  for (let i = 0; i < uids.length; i += 30) chunks.push(uids.slice(i, i + 30));

  const profiles: UserProfile[] = [];
  for (const chunk of chunks) {
    const snap = await getDocs(query(collection(db, 'users'), where(documentId(), 'in', chunk)));
    snap.docs.forEach((d) => {
      const stats = statsByUser.get(d.id);
      if (!stats) return;
      const data = d.data();
      profiles.push({
        uid: d.id,
        email: '',
        displayName: (data.displayName as string) ?? 'İsimsiz Oyuncu',
        currentStreak: 0,
        bestStreak: 0,
        totalPredictions: stats.total,
        correctPredictions: stats.correct,
        badges: (data.badges as UserProfile['badges']) ?? [],
        isAdmin: false,
        avatarUrl: (data.avatarUrl as string) || null,
        createdAt: '',
        updatedAt: '',
      });
    });
  }

  return profiles.sort(
    (a, b) => b.correctPredictions - a.correctPredictions || b.totalPredictions - a.totalPredictions,
  );
}
