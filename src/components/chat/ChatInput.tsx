import { useState, type FormEvent } from 'react';
import { Button } from '@/components/common/Button';
import { MAX_MESSAGE_LENGTH } from '@/services/chatService';

interface ChatInputProps {
  onSend: (text: string) => Promise<void>;
  disabled?: boolean;
  disabledReason?: string;
}

/** Mesaj yazma ve gönderme kutusu. */
export function ChatInput({ onSend, disabled = false, disabledReason }: ChatInputProps) {
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
