import { useEffect, useRef } from 'react';
import type { ChatMessage } from '@/types';
import { formatChatTime } from '@/utils/dateUtils';
import { Link } from 'react-router-dom';
import { Avatar } from '@/components/common/Avatar';

interface ChatMessageListProps {
  messages: ChatMessage[];
  currentUserId?: string;
  isAdmin?: boolean;
  canReply?: boolean;
  onReply?: (message: ChatMessage) => void;
  onDelete?: (messageId: string) => void;
}

/**
 * Sohbet mesajlarını listeler; yeni mesaj geldiğinde otomatik olarak en alta kayar.
 * Her mesajın altında "Yanıtla" (giriş yapmış herkes) ve "Sil" (sadece admin)
 * bağlantıları bulunur. Bir mesaj başka bir mesajı yanıtlıyorsa, alıntılanan
 * kısım metnin üstünde küçük bir kutuda gösterilir.
 */
export function ChatMessageList({
  messages,
  currentUserId,
  isAdmin = false,
  canReply = false,
  onReply,
  onDelete,
}: ChatMessageListProps) {
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
            <div className="mb-0.5 flex items-center gap-2">
              <Avatar avatarUrl={message.avatarUrl} size="sm" />
              <Link
                to={`/oyuncu/${message.userId}`}
                className="font-display text-xs font-semibold text-scoreboard-amberDark hover:underline dark:text-scoreboard-amber"
              >
                {message.displayName}
                {message.isAdmin && (
                  <span className="ml-1 font-mono text-[10px] font-normal text-pitch-700/50 dark:text-pitch-100/40">
                    (admin)
                  </span>
                )}
              </Link>
              <span className="font-mono text-[10px] text-pitch-700/40 dark:text-pitch-100/30">
                {formatChatTime(message.createdAt)}
              </span>
            </div>

            {message.replyTo && (
              <div className="mb-1 rounded-md border-l-2 border-pitch-700/20 bg-pitch-700/5 px-2 py-1 dark:border-pitch-700 dark:bg-pitch-900/40">
                <p className="truncate font-mono text-xs text-pitch-700/60 dark:text-pitch-100/40">
                  <strong>{message.replyTo.displayName}</strong>: {message.replyTo.text}
                </p>
              </div>
            )}

            <p className="whitespace-pre-wrap break-words font-body">{message.text}</p>

            {(canReply || isAdmin) && (
              <div className="mt-1 flex gap-3">
                {canReply && (
                  <button
                    type="button"
                    onClick={() => onReply?.(message)}
                    className="font-mono text-[10px] text-pitch-700/50 hover:text-scoreboard-amber dark:text-pitch-100/40"
                  >
                    Yanıtla
                  </button>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => onDelete?.(message.id)}
                    className="font-mono text-[10px] text-pitch-700/50 hover:text-pick-wrong dark:text-pitch-100/40"
                  >
                    Sil
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
