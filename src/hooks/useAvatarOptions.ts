import { useEffect, useState } from 'react';
import type { AsyncState } from '@/types';
import { subscribeAvatarOptions, type AvatarOption } from '@/services/avatarOptionsService';

/** Admin tarafından belirlenen avatar seçeneklerini gerçek zamanlı getirir. */
export function useAvatarOptions(): AsyncState<AvatarOption[]> {
  const [state, setState] = useState<AsyncState<AvatarOption[]>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = subscribeAvatarOptions(
      (options) => setState({ data: options, loading: false, error: null }),
      (error) => setState({ data: null, loading: false, error }),
    );
    return unsubscribe;
  }, []);

  return state;
}
