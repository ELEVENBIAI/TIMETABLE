import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Vollbreite Button — auf Mobile typischerweise Pflicht für Touch-Targets ≥48px */
  fullWidth?: boolean;
  /** Optional Icon links vor dem Label */
  leadingIcon?: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-primary text-brand-on-primary hover:bg-brand-primary-hover ' +
    'focus-visible:outline-brand-primary',
  secondary:
    'bg-surface text-text-primary border border-border hover:bg-surface-sunken ' +
    'focus-visible:outline-brand-primary',
  ghost:
    'bg-transparent text-text-secondary hover:bg-surface-sunken hover:text-text-primary ' +
    'focus-visible:outline-brand-primary',
  destructive:
    'bg-transparent text-status-conflict border border-status-conflict ' +
    'hover:bg-status-conflict hover:text-brand-on-primary ' +
    'focus-visible:outline-status-conflict',
};

// Touch-Targets ≥44px Mobile (Apple HIG) — wir nehmen 44px als Minimum und 48px für lg.
const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-label',
  md: 'h-11 px-4 text-label md:h-10 md:text-label', // 44px mobile, 40px desktop
  lg: 'h-12 px-5 text-body md:h-11', // 48px mobile, 44px desktop
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      leadingIcon,
      disabled,
      className,
      children,
      type = 'button',
      ...rest
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={[
          'inline-flex items-center justify-center gap-2 rounded-md font-medium',
          'transition-colors duration-100',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-60',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          fullWidth ? 'w-full' : '',
          className ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        {loading ? (
          <Loader2 size={16} aria-hidden="true" className="animate-spin" />
        ) : leadingIcon ? (
          <span aria-hidden="true" className="flex items-center">
            {leadingIcon}
          </span>
        ) : null}
        <span>{children}</span>
      </button>
    );
  }
);
Button.displayName = 'Button';
