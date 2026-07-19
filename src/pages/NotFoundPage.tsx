import { Link } from 'react-router-dom';

/** Tanımsız rotalar için 404 sayfası. */
export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <p className="font-mono text-5xl font-bold text-scoreboard-amber">404</p>
      <p className="font-body text-sm text-pitch-700/70 dark:text-pitch-100/50">
        Aradığın sayfa bulunamadı.
      </p>
      <Link to="/" className="font-display text-sm font-medium text-scoreboard-amber">
        Ana sayfaya dön
      </Link>
    </div>
  );
}
