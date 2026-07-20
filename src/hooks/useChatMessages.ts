import { useEffect, useState } from 'react';
import type { AsyncState, ChatMessage } from '@/types';
import { subscribeMessages } from '@/services/chatService';

/** Sohbet kanalındaki mesajları gerçek zamanlı olarak getirir. */
export function useChatMessages(): AsyncState<ChatMessage[]> {
  const [state, setState] = useState<AsyncState<ChatMessage[]>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = subscribeMessages(
      (messages) => setState({ data: messages, loading: false, error: null }),
      (error) => setState({ data: null, loading: false, error }),
    );
    return unsubscribe;
  }, []);

  return state;
}
