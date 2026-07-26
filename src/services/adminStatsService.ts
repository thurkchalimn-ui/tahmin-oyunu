import { collection, query, where, getCountFromServer, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface AdminStats {
  totalUsers: number;
  totalMatches: number;
  totalPredictions: number;
  activeUsersLast7Days: number;
  topLeagues: { league: string; matchCount: number }[];
}

/**
 * Admin panelinde gösterilecek özet istatistikleri toplar. Mümkün olan her
 * yerde `getCountFromServer` kullanılır - bu, eşleşen dokümanların TAMAMINI
 * okumadan sadece SAYISINI döner (Firestore'da bu, normal bir okumadan çok
 * daha ucuzdur), böylece günlük kotayı gereksiz yere tüketmez.
 */
export async function getAdminStats(): Promise<AdminStats> {
  const [usersCount, matchesCount, predictionsCount] = await Promise.all([
    getCountFromServer(collection(db, 'users')),
    getCountFromServer(collection(db, 'matches')),
    getCountFromServer(collection(db, 'predictions')),
  ]);

  const sevenDaysAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const activeSnap = await getCountFromServer(
    query(collection(db, 'users'), where('lastActiveAt', '>=', sevenDaysAgoIso)),
  );

  // "En çok maçı olan ligler": son 30 gündeki maçlar league alanına göre
  // gruplanır. Bu, tek tek doküman okumayı gerektirir (count sorgusu grup
  // bazlı sayamaz) ama 30 günlük bir pencereyle sınırlı olduğu için makul.
  const thirtyDaysAgoIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const matchesSnap = await getDocs(
    query(collection(db, 'matches'), where('date', '>=', thirtyDaysAgoIso)),
  );
  const leagueCounts = new Map<string, number>();
  matchesSnap.docs.forEach((d) => {
    const league = (d.data().league as string) || 'Belirtilmemiş';
    leagueCounts.set(league, (leagueCounts.get(league) ?? 0) + 1);
  });
  const topLeagues = [...leagueCounts.entries()]
    .map(([league, matchCount]) => ({ league, matchCount }))
    .sort((a, b) => b.matchCount - a.matchCount)
    .slice(0, 5);

  return {
    totalUsers: usersCount.data().count,
    totalMatches: matchesCount.data().count,
    totalPredictions: predictionsCount.data().count,
    activeUsersLast7Days: activeSnap.data().count,
    topLeagues,
  };
}
