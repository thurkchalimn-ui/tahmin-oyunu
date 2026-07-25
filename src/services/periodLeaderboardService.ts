import { collection, query, where, getDocs, documentId } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { UserProfile } from '@/types';
import { getPeriodRange } from '@/utils/periodUtils';

export type LeaderboardPeriod = 'week' | 'month';

/**
 * Belirli bir dönem (bu hafta / bu ay) için liderlik tablosunu hesaplar.
 *
 * ÖNEMLİ: Tahminlerin kendi üzerindeki `date` alanına GÜVENİLMEZ - bu alan
 * sadece belirli bir tarihten sonra eklenen tahminlerde var (daha eski
 * tahminlerde hiç yok), bu da onları sessizce dışarıda bırakırdı. Bunun
 * yerine profil sayfalarındaki (usePredictionHistory) yöntemle BİREBİR AYNI
 * mantık kullanılır: önce o dönemdeki MAÇLAR bulunur (maçın `date` alanı her
 * zaman güvenilirdir), sonra o maçlara ait tahminler toplu çekilir.
 */
export async function getPeriodLeaderboard(period: LeaderboardPeriod): Promise<UserProfile[]> {
  const range = getPeriodRange(period);
  if (!range) return [];

  // Adım 1: O döneme ait maçların ID'lerini bul
  const matchesSnap = await getDocs(
    query(collection(db, 'matches'), where('date', '>=', range.start), where('date', '<', range.end)),
  );
  const matchIds = matchesSnap.docs.map((d) => d.id);
  if (matchIds.length === 0) return [];

  // Adım 2: Bu maçlara ait tahminleri toplu (30'arlık gruplar halinde) çek
  const matchIdChunks: string[][] = [];
  for (let i = 0; i < matchIds.length; i += 30) matchIdChunks.push(matchIds.slice(i, i + 30));

  const statsByUser = new Map<string, { total: number; correct: number }>();
  for (const chunk of matchIdChunks) {
    const predSnap = await getDocs(query(collection(db, 'predictions'), where('matchId', 'in', chunk)));
    predSnap.docs.forEach((d) => {
      const data = d.data();
      if (data.isCorrect !== true && data.isCorrect !== false) return; // sadece sonuçlananlar
      const uid = data.userId as string;
      const entry = statsByUser.get(uid) ?? { total: 0, correct: 0 };
      entry.total += 1;
      if (data.isCorrect === true) entry.correct += 1;
      statsByUser.set(uid, entry);
    });
  }

  const uids = [...statsByUser.keys()];
  if (uids.length === 0) return [];

  // Adım 3: Kullanıcı profillerini (isim, avatar, rozet) toplu çek - 30'arlık gruplar halinde
  const userIdChunks: string[][] = [];
  for (let i = 0; i < uids.length; i += 30) userIdChunks.push(uids.slice(i, i + 30));

  const profiles: UserProfile[] = [];
  for (const chunk of userIdChunks) {
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
