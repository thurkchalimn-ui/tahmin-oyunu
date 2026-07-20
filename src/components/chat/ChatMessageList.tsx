import { useEffect, useRef } from 'react';
import type { ChatMessage } from '@/types';
import { formatChatTime } from '@/utils/dateUtils';
import { Link } from 'react-router-dom';

interface ChatMessageListProps {
  messages: ChatMessage[];
  currentUserId?: string;
}

/** Sohbet mesajlarını listeler; yeni mesaj geldiğinde otomatik olarak en alta kayar. */
export function ChatMessageList({ messages, currentUserId }: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="font-body text-sm text-pitch-700/60 dark:text-pitch-100/50">
          Henüz mesaj yok. İlk mesajı sen gönder!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-1 py-2">
      {messages.map((message) => {
        const isOwn = message.userId === currentUserId;
        return (
          <div
            key={message.id}
            className={`flex flex-col rounded-lg px-3 py-2 text-sm ${
              isOwn
                ? 'ml-auto max-w-[85%] bg-scoreboard-amber/15 text-pitch-900 dark:text-pitch-100'
                : 'mr-auto max-w-[85%] bg-pitch-700/5 text-pitch-900 dark:bg-pitch-800 dark:text-pitch-100'
            }`}
          >
            <div className="mb-0.5 flex items-baseline gap-2">
              <Link
                to={`/oyuncu/${message.userId}`}
                className="font-display text-xs font-semibold text-scoreboard-amberDark hover:underline dark:text-scoreboard-amber"
              >
                {message.displayName}
              </Link>
              <span className="font-mono text-[10px] text-pitch-700/40 dark:text-pitch-100/30">
                {formatChatTime(message.createdAt)}
              </span>
            </div>
            <p className="whitespace-pre-wrap break-words font-body">{message.text}</p>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
