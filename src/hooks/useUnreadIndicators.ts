import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { subscribeLatestMessageTime } from '@/services/chatService';
import { subscribeUserPredictions } from '@/services/predictionService';

export interface UnreadIndicators {
  hasChatUnread: boolean;
  hasRankChange: boolean;
  hasProfileUnread: boolean;
  currentRank: number; // 0 ise liderlik listesinde (ilk 50) yer almıyor demektir
}

/**
 * Üç bildirim göstergesini (kırmızı nokta) hesaplar:
 * - Sohbet: en son mesaj, kullanıcının en son sohbeti gördüğü andan sonraysa
 * - Liderlik: kullanıcının güncel sırası, en son gördüğü sıradan farklıysa
 * - Profil: bir tahmini, kullanıcının en son profili gördüğü andan sonra sonuçlandıysa
 * Bu göstergeler BottomNav'da kullanılır; ilgili sayfa ziyaret edildiğinde
 * readStatusService.ts'deki fonksiyonlarla "görüldü" olarak işaretlenir.
 */
export function useUnreadIndicators(): UnreadIndicators {
  const { firebaseUser, profile } = useAuth();
  const { data: leaderboard } = useLeaderboard();
  const [latestMessageAt, setLatestMessageAt] = useState<string | null>(null);
  const [hasProfileUnread, setHasProfileUnread] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeLatestMessageTime(setLatestMessageAt);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!firebaseUser) {
      setHasProfileUnread(false);
      return;
    }
    const lastSeenMs = profile?.lastSeenProfileAt ? new Date(profile.lastSeenProfileAt).getTime() : 0;
    const unsubscribe = subscribeUserPredictions(
      firebaseUser.uid,
      (predictions) => {
        const found = predictions.some(
          (p) => p.resolvedAt && new Date(p.resolvedAt).getTime() > lastSeenMs,
        );
        setHasProfileUnread(found);
      },
      () => setHasProfileUnread(false),
    );
    return unsubscribe;
  }, [firebaseUser, profile?.lastSeenProfileAt]);

  const hasChatUnread = Boolean(
    latestMessageAt &&
      (!profile?.lastSeenChatAt ||
        new Date(latestMessageAt).getTime() > new Date(profile.lastSeenChatAt).getTime()),
  );

  const currentRank =
    firebaseUser && leaderboard ? leaderboard.findIndex((u) => u.uid === firebaseUser.uid) + 1 : 0;

  const hasRankChange = Boolean(
    firebaseUser &&
      currentRank > 0 &&
      profile?.lastSeenRank != null &&
      profile.lastSeenRank !== currentRank,
  );

  return { hasChatUnread, hasRankChange, hasProfileUnread, currentRank };
}
