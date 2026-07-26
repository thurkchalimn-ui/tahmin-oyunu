import { useEffect, useState } from 'react';
import { collection, query, where, documentId, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { mapUserDoc } from '@/services/userService';
import type { UserProfile } from '@/types';

/** Verilen kullanıcı ID listesine ait profilleri toplu (30'arlık gruplar halinde) getirir. */
export function usePlayerProfilesByIds(uids: string[]): { data: UserProfile[]; loading: boolean } {
  const [data, setData] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const key = uids.slice().sort().join(',');

  useEffect(() => {
    if (uids.length === 0) {
      setData([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const chunks: string[][] = [];
      for (let i = 0; i < uids.length; i += 30) chunks.push(uids.slice(i, i + 30));
      const profiles: UserProfile[] = [];
      for (const chunk of chunks) {
        const snap = await getDocs(query(collection(db, 'users'), where(documentId(), 'in', chunk)));
        snap.docs.forEach((d) => profiles.push(mapUserDoc(d.id, d.data())));
      }
      if (!cancelled) {
        setData(profiles);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { data, loading };
}
