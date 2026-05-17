// App-weites Error-Boundary (ELE-189).
// Fängt unbehandelte React-Render-Errors auf und zeigt User-freundliche Fallback-UI.
// Wenn Tracking aktiv ist, wird der Fehler automatisch an GlitchTip/Sentry gemeldet.

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';
import { captureException } from '@/lib/tracking';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage?: string;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    captureException(error, { componentStack: info.componentStack ?? '' });
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    // Fallback-UI: keine i18n hier — falls i18n selbst kaputt ist soll der Fallback trotzdem
    // sichtbar sein. EN-Default mit DE als Sekundär in einer Zeile.
    return (
      <div
        role="alert"
        className="flex min-h-screen items-center justify-center bg-surface p-6"
        data-testid="app-error-boundary"
      >
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <AlertOctagon size={40} className="text-status-conflict" aria-hidden="true" />
          <h1 className="text-display font-semibold text-text-primary">Etwas ist schiefgelaufen</h1>
          <p className="text-body text-text-secondary">
            Die App hat einen unerwarteten Fehler erkannt. Bitte lade die Seite neu. Falls das
            Problem bestehen bleibt, melde dich bei deinem Administrator.
            <br />
            <em className="text-label text-text-muted">
              Something went wrong — please reload. Contact support if it persists.
            </em>
          </p>
          {this.state.errorMessage ? (
            <details className="w-full max-w-sm rounded-md border border-border bg-surface-sunken px-3 py-2 text-left text-label text-text-muted">
              <summary className="cursor-pointer">Technische Details</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words">{this.state.errorMessage}</pre>
            </details>
          ) : null}
          <button
            type="button"
            onClick={this.handleReload}
            className="inline-flex items-center gap-2 rounded-md bg-brand-primary px-4 py-2 text-label font-medium text-brand-on-primary hover:opacity-90"
          >
            <RefreshCw size={14} aria-hidden="true" />
            Seite neu laden
          </button>
        </div>
      </div>
    );
  }
}
