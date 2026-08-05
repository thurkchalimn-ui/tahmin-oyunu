import { useEffect, useState } from 'react';
import { subscribeNotifications } from '@/services/notificationCenterService';
import type { AppNotification } from '@/types';

/** Kullanıcının bildirimlerini gerçek zamanlı dinler. */
export function useNotifications(uid: string | undefined) {
  const [data, setData] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeNotifications(
      uid,
      (list) => {
        setData(list);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsubscribe;
  }, [uid]);

  const unreadCount = data.filter((n) => !n.isRead).length;

  return { data, loading, unreadCount };
}
