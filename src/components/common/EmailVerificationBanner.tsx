import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { resendVerificationEmail } from '@/services/authService';
import { Button } from '@/components/common/Button';

type Status = 'idle' | 'sending' | 'sent' | 'checking' | 'notYet';

/**
 * Giriş yapmış ama e-postasını doğrulamamış kullanıcılara üstte sabit görünen uyarı.
 * Doğrulanana kadar tahmin yapamayacakları için burada hem hatırlatma yapılır
 * hem de tekrar mail gönderme / durumu tazeleme imkanı sunulur.
 */
export function EmailVerificationBanner() {
  const { firebaseUser, emailVerified, refreshEmailVerification } = useAuth();
  const [status, setStatus] = useState<Status>('idle');

  if (!firebaseUser || emailVerified) return null;

  async function handleResend() {
    if (!firebaseUser) return;
    setStatus('sending');
    try {
      await resendVerificationEmail(firebaseUser);
      setStatus('sent');
    } catch {
      setStatus('idle');
    }
  }

  async function handleCheck() {
    setStatus('checking');
    const verified = await refreshEmailVerification();
    setStatus(verified ? 'idle' : 'notYet');
  }

  return (
    <div className="border-b border-scoreboard-amber/40 bg-scoreboard-amber/10 px-4 py-3 text-center">
      <p className="font-body text-sm text-pitch-900 dark:text-pitch-100">
        📧 <strong>{firebaseUser.email}</strong> adresine gönderdiğimiz linke tıklayana kadar tahmin
        yapamazsın.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <Button
          variant="secondary"
          onClick={handleResend}
          isLoading={status === 'sending'}
          className="!px-3 !py-1.5 text-xs"
        >
          {status === 'sent' ? 'Tekrar gönderildi ✓' : 'Maili tekrar gönder'}
        </Button>
        <Button
          variant="ghost"
          onClick={handleCheck}
          isLoading={status === 'checking'}
          className="!px-3 !py-1.5 text-xs"
        >
          Doğruladım, kontrol et
        </Button>
      </div>
      {status === 'notYet' && (
        <p className="mt-1.5 font-mono text-xs text-pick-wrong">
          Henüz doğrulanmamış görünüyor. Linke tıkladıysan birkaç saniye bekleyip tekrar dene.
        </p>
      )}
    </div>
  );
}
