import { useAuth } from '@/hooks/useAuth';
import { useChatMessages } from '@/hooks/useChatMessages';
import { sendMessage } from '@/services/chatService';
import { ChatMessageList } from '@/components/chat/ChatMessageList';
import { ChatInput } from '@/components/chat/ChatInput';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';

/** Kullanıcıların birbirine kullanıcı adlarıyla göründüğü, herkese açık sohbet kanalı. */
export function ChatPage() {
  const { firebaseUser, profile, emailVerified, isAdmin } = useAuth();
  const { data: messages, loading, error } = useChatMessages();

  async function handleSend(text: string) {
    if (!firebaseUser || !profile) return;
    await sendMessage(firebaseUser.uid, profile.displayName, text, isAdmin);
  }

  const disabled = !firebaseUser || !emailVerified;
  const disabledReason = !firebaseUser
    ? 'Mesaj göndermek için giriş yapmalısın.'
    : !emailVerified
      ? 'Mesaj göndermek için önce e-postanı doğrulaman gerekiyor.'
      : undefined;

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-2xl flex-col px-4 py-4">
      <h1 className="mb-3 font-display text-xl font-semibold text-pitch-900 dark:text-pitch-100">
        Sohbet
      </h1>

      {loading ? (
        <LoadingSpinner fullScreen label="Mesajlar yükleniyor..." />
      ) : error ? (
        <ErrorMessage message={error} />
      ) : (
        <ChatMessageList messages={messages ?? []} currentUserId={firebaseUser?.uid} />
      )}

      <div className="mt-3">
        <ChatInput onSend={handleSend} disabled={disabled} disabledReason={disabledReason} />
      </div>
    </div>
  );
}
