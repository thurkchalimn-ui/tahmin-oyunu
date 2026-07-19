import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  isLoading?: boolean;
}

const VARIANT_CLASSES: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-scoreboard-amber text-pitch-950 hover:bg-scoreboard-amberDark shadow-glow',
  secondary:
    'bg-pitch-700 text-pitch-100 hover:bg-pitch-800 dark:bg-pitch-800 dark:hover:bg-pitch-700',
  danger: 'bg-pick-wrong text-white hover:opacity-90',
  ghost: 'bg-transparent text-pitch-900 dark:text-pitch-100 hover:bg-pitch-100 dark:hover:bg-pitch-800',
};

/** Uygulama genelinde kullanılan standart buton; loading durumunu görsel olarak yansıtır. */
export function Button({
  children,
  variant = 'primary',
  isLoading = false,
  disabled,
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5
        font-body font-medium text-sm transition-all duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus-visible:ring-2 focus-visible:ring-scoreboard-amber focus-visible:ring-offset-2
        ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    >
      {isLoading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
