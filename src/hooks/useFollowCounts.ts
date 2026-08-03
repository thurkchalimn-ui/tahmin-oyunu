import { useEffect, useState } from 'react';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '@/config/firebase';

/**
 * Bir kullanıcının takipçi ve takip ettiği kişi sayısını getirir. Sadece
 * SAYI döndürür (getCountFromServer) - kota dostu, tam liste çekmez.
 * followService.ts'in mevcut durumuna bağımlı olmaması için kendi içinde
 * bağımsız (self-contained) tanımlanmıştır.
 */
export function useFollowCounts(uid: string | undefined) {
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [followingCount, setFollowingCount] = useState<number | null>(null);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;

    getCountFromServer(query(collection(db, 'follows'), where('followedUid', '==', uid))).then((snap) => {
      if (!cancelled) setFollowerCount(snap.data().count);
    });
    getCountFromServer(query(collection(db, 'follows'), where('followerUid', '==', uid))).then((snap) => {
      if (!cancelled) setFollowingCount(snap.data().count);
    });

    return () => {
      cancelled = true;
    };
  }, [uid]);

  return { followerCount, followingCount };
}
