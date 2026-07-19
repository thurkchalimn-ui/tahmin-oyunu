import { useEffect, useState } from 'react';
import type { AsyncState, UserProfile } from '@/types';
import { subscribeUserProfile } from '@/services/userService';

/** Liderlik tablosundan tıklanan herhangi bir oyuncunun profilini getirir. */
export function usePlayerProfile(uid: string | undefined): AsyncState<UserProfile> {
  const [state, setState] = useState<AsyncState<UserProfile>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!uid) {
      setState({ data: null, loading: false, error: 'Kullanıcı bulunamadı.' });
      return;
    }
    setState({ data: null, loading: true, error: null });
    const unsubscribe = subscribeUserProfile(
      uid,
      (profile) =>
        setState({
          data: profile,
          loading: false,
          error: profile ? null : 'Kullanıcı bulunamadı.',
        }),
      (error) => setState({ data: null, loading: false, error }),
    );
    return unsubscribe;
  }, [uid]);

  return state;
}
