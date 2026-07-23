import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '@/services/authService';
import { Button } from '@/components/common/Button';
import { translateAuthError, isValidEmail, isValidPassword, isNonEmpty } from '@/utils/validators';

/** Yeni kullanıcı kayıt sayfası. */
export function RegisterPage() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isNonEmpty(displayName)) {
      setError('Kullanıcı adı boş bırakılamaz.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Geçerli bir e-posta adresi girin.');
      return;
    }
    if (!isValidPassword(password)) {
      setError('Şifre en az 6 karakter olmalı.');
      return;
    }

    setIsSubmitting(true);
    try {
      await registerUser(email, password, displayName);
      navigate('/');
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code) {
        // Firebase Auth hatası (ör. e-posta zaten kullanımda)
        setError(translateAuthError(code));
      } else if (err instanceof Error) {
        // Kendi doğrulama hatalarımız (küfür filtresi, kullanıcı adı çakışması)
        setError(err.message);
      } else {
        setError('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-5 px-4 py-14">
      <h1 className="font-display text-2xl font-semibold text-pitch-900 dark:text-pitch-100">
        Kayıt Ol
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-pitch-900 dark:text-pitch-100">
          Kullanıcı Adı
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="rounded-md border border-pitch-700/20 bg-transparent px-3 py-2 dark:border-pitch-700"
          />
        </label>

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
            autoComplete="new-password"
            className="rounded-md border border-pitch-700/20 bg-transparent px-3 py-2 dark:border-pitch-700"
          />
        </label>

        {error && <p className="text-sm text-pick-wrong">{error}</p>}

        <Button type="submit" isLoading={isSubmitting}>
          Kayıt Ol
        </Button>
      </form>

      <p className="text-center text-sm text-pitch-700/70 dark:text-pitch-100/50">
        Zaten hesabın var mı?{' '}
        <Link to="/giris" className="font-medium text-scoreboard-amber">
          Giriş yap
        </Link>
      </p>
    </div>
  );
}
