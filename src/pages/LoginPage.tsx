import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser } from '@/services/authService';
import { Button } from '@/components/common/Button';
import { translateAuthError, isValidEmail } from '@/utils/validators';

/** E-posta/şifre ile giriş sayfası. */
export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      </form>

      <p className="text-center text-sm text-pitch-700/70 dark:text-pitch-100/50">
        Hesabın yok mu?{' '}
        <Link to="/kayit" className="font-medium text-scoreboard-amber">
          Kayıt ol
        </Link>
      </p>
    </div>
  );
}
