import { useState, type FormEvent } from 'react';
import { Button } from '@/components/common/Button';
import { MAX_MESSAGE_LENGTH } from '@/services/chatService';

interface ReplyPreview {
  displayName: string;
  text: string;
}

interface ChatInputProps {
  onSend: (text: string) => Promise<void>;
  disabled?: boolean;
  disabledReason?: string;
  replyingTo?: ReplyPreview | null;
  onCancelReply?: () => void;
}

/** Mesaj yazma ve gönderme kutusu. Yanıtlanan bir mesaj varsa üstünde bir önizleme gösterir. */
export function ChatInput({
  onSend,
  disabled = false,
  disabledReason,
  replyingTo,
  onCancelReply,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    setError(null);
    setIsSending(true);
    try {
      await onSend(text);
      setText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mesaj gönderilemedi.');
    } finally {
      setIsSending(false);
    }
  }

  if (disabled) {
    return (
      <p className="rounded-lg border border-dashed border-pitch-700/20 px-3 py-2.5 text-center font-mono text-xs text-pitch-700/50 dark:border-pitch-700 dark:text-pitch-100/40">
        {disabledReason ?? 'Mesaj göndermek için giriş yapmalısın.'}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1">
      {replyingTo && (
        <div className="flex items-start justify-between gap-2 rounded-md border-l-2 border-scoreboard-amber bg-scoreboard-amber/10 px-2 py-1.5">
          <p className="min-w-0 flex-1 truncate font-mono text-xs text-pitch-700/70 dark:text-pitch-100/60">
            <strong className="text-scoreboard-amberDark dark:text-scoreboard-amber">
              {replyingTo.displayName}
            </strong>{' '}
            yanıtlanıyor: "{replyingTo.text}"
          </p>
          <button
            type="button"
            onClick={onCancelReply}
            aria-label="Yanıtlamayı iptal et"
            className="shrink-0 font-mono text-xs text-pitch-700/50 hover:text-pick-wrong dark:text-pitch-100/40"
          >
            ✕
          </button>
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder="Bir mesaj yaz..."
          className="flex-1 rounded-md border border-pitch-700/20 bg-transparent px-3 py-2 text-sm dark:border-pitch-700"
        />
        <Button type="submit" isLoading={isSending} disabled={!text.trim()} className="!px-4">
          Gönder
        </Button>
      </div>
      {error && <p className="text-xs text-pick-wrong">{error}</p>}
    </form>
  );
}
