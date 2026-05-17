import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  error?: ReactNode;
  /** Hilfetext unter dem Input (z.B. Format-Hint) */
  hint?: ReactNode;
  /** Icon im rechten Padding (z.B. Eye-Toggle für Passwort-Felder) */
  rightSlot?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, rightSlot, id, className, disabled, ...rest }, ref) => {
    const reactId = useId();
    const inputId = id ?? reactId;
    const hintId = hint ? `${inputId}-hint` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-label text-text-secondary">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={describedBy}
            className={[
              'block w-full rounded-sm border bg-surface px-3 py-2 text-body text-text-primary',
              'placeholder:text-text-muted',
              'focus:outline focus:outline-2 focus:outline-offset-0',
              error
                ? 'border-status-conflict focus:outline-status-conflict'
                : 'border-border focus:outline-brand-primary',
              'disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-text-muted',
              'h-11 md:h-10', // 44px Touch-Target mobil
              rightSlot ? 'pr-10' : '',
              className ?? '',
            ]
              .filter(Boolean)
              .join(' ')}
            {...rest}
          />
          {rightSlot && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 text-text-secondary">
              {rightSlot}
            </div>
          )}
        </div>
        {hint && !error && (
          <p id={hintId} className="text-label text-text-muted">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-label text-status-conflict">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
