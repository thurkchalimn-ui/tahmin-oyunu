interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

/** Veri çekme veya işlem hatalarında gösterilen standart hata kutusu. */
export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-lg border border-pick-wrong/40
        bg-pick-wrong/10 px-4 py-6 text-center"
    >
      <p className="font-body text-sm text-pick-wrong">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-md border border-pick-wrong px-3 py-1.5 text-xs font-medium text-pick-wrong
            transition hover:bg-pick-wrong hover:text-white"
        >
          Tekrar dene
        </button>
      )}
    </div>
  );
}
