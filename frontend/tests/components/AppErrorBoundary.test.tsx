// AppErrorBoundary fängt Render-Errors (ELE-189).

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';

function ThrowingChild(): JSX.Element {
  throw new Error('Render boom');
}

beforeEach(() => {
  // React loggt den Fehler in der Konsole — wir wollen das im Test ruhig
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('AppErrorBoundary (ELE-189)', () => {
  it('rendert Children wenn kein Fehler', () => {
    render(
      <AppErrorBoundary>
        <div data-testid="ok">all good</div>
      </AppErrorBoundary>
    );
    expect(screen.getByTestId('ok')).toBeInTheDocument();
  });

  it('zeigt Fallback-UI wenn Child throwt', () => {
    render(
      <AppErrorBoundary>
        <ThrowingChild />
      </AppErrorBoundary>
    );
    expect(screen.getByTestId('app-error-boundary')).toBeInTheDocument();
    expect(screen.getByText(/Seite neu laden/i)).toBeInTheDocument();
    expect(screen.getByText('Render boom')).toBeInTheDocument();
  });

  it('Fallback enthält DE + EN Hinweistext', () => {
    render(
      <AppErrorBoundary>
        <ThrowingChild />
      </AppErrorBoundary>
    );
    // DE-Text
    expect(screen.getByText(/unerwarteten Fehler/i)).toBeInTheDocument();
    // EN-Text (em-Tag)
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
  });
});
