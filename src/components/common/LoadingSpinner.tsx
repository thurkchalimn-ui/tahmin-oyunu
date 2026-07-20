interface LoadingSpinnerProps {
  label?: string;
  fullScreen?: boolean;
}

/** Skorbord temalı yükleniyor göstergesi. Veri çekme süresince kullanılır. */
export function LoadingSpinner({ label = 'Yükleniyor...', fullScreen = false }: LoadingSpinnerProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 text-pitch-700 dark:text-pitch-100
        ${fullScreen ? 'min-h-[60vh]' : 'py-10'}`}
      role="status"
      aria-live="polite"
    >
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-scoreboard-amber border-t-transparent" />
      <span className="font-mono text-sm tracking-wide">{label}</span>
    </div>
  );
}
