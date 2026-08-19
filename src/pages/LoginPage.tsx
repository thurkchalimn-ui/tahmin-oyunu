import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser, resetPassword } from '@/services/authService';
import { Button } from '@/components/common/Button';
import { translateAuthError, isValidEmail } from '@/utils/validators';
import { usePageTitle } from '@/hooks/usePageTitle';

/** E-posta/şifre ile giriş sayfası. */
export function LoginPage() {
  usePageTitle('Giriş Yap');
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [resetError, setResetError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isValidEmail(email)) {
      setError('Geçerli bir e-posta adresi girin.');
      return;
    }

    setIsSubmitting(true);
    try {
      await loginUser(email, password);
      navigate('/');
    } catch (err) {
      const code = (err as { code?: string }).code ?? '';
      setError(translateAuthError(code));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetSubmit(e: FormEvent) {
    e.preventDefault();
    setResetError(null);
    if (!isValidEmail(resetEmail)) {
      setResetError('Geçerli bir e-posta adresi girin.');
      return;
    }
    setResetStatus('sending');
    try {
      await resetPassword(resetEmail);
      setResetStatus('sent');
    } catch (err) {
      const code = (err as { code?: string }).code ?? '';
      setResetError(translateAuthError(code));
      setResetStatus('error');
    }
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-5 px-4 py-14">
      <h1 className="font-display text-2xl font-semibold text-pitch-900 dark:text-pitch-100">
        Giriş Yap
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-pitch-900 dark:text-pitch-100">
          E-posta
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="rounded-md border border-pitch-700/20 bg-transparent px-3 py-2 dark:border-pitch-700"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-pitch-900 dark:text-pitch-100">
          Şifre
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="rounded-md border border-pitch-700/20 bg-transparent px-3 py-2 dark:border-pitch-700"
          />
        </label>

        {error && <p className="text-sm text-pick-wrong">{error}</p>}

        <Button type="submit" isLoading={isSubmitting}>
          Giriş Yap
        </Button>

        <button
          type="button"
          onClick={() => {
            setShowResetForm((v) => !v);
            setResetStatus('idle');
            setResetError(null);
          }}
          className="text-center font-mono text-xs text-pitch-700/60 hover:text-scoreboard-amber dark:text-pitch-100/50"
        >
          Şifremi unuttum
        </button>
      </form>

      {showResetForm && (
        <form
          onSubmit={handleResetSubmit}
          className="flex flex-col gap-2 rounded-lg border border-pitch-700/15 bg-white p-3 dark:border-pitch-700 dark:bg-pitch-800"
        >
          {resetStatus === 'sent' ? (
            <p className="text-sm text-pick-correct">
              Şifre sıfırlama linki {resetEmail} adresine gönderildi. E-postanı (spam klasörü dahil) kontrol et.
            </p>
          ) : (
            <>
              <label className="flex flex-col gap-1 text-xs text-pitch-900 dark:text-pitch-100">
                Kayıtlı e-posta adresin
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="rounded-md border border-pitch-700/20 bg-transparent px-3 py-2 text-sm dark:border-pitch-700"
                />
              </label>
              {resetError && <p className="text-xs text-pick-wrong">{resetError}</p>}
              <Button type="submit" isLoading={resetStatus === 'sending'} className="text-xs">
                Sıfırlama Linki Gönder
              </Button>
            </>
          )}
        </form>
      )}

      <p className="text-center text-sm text-pitch-700/70 dark:text-pitch-100/50">
        Hesabın yok mu?{' '}
        <Link to="/kayit" className="font-medium text-scoreboard-amber">
          Kayıt ol
        </Link>
      </p>
    </div>
  );
}
