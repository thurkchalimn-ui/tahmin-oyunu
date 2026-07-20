import { useTheme } from '@/context/ThemeContext';

/** Dark/Light mode arasında geçiş yapan ikon buton. */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Açık moda geç' : 'Koyu moda geç'}
      className="flex h-9 w-9 items-center justify-center rounded-full text-lg
        text-pitch-900 transition hover:bg-pitch-100 dark:text-pitch-100 dark:hover:bg-pitch-800"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
