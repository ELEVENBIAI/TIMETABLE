import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/styles/index.css';
import { App } from '@/App';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { decodeJwt } from '@/lib/jwt';
import { getStoredToken } from '@/lib/auth';
import { resolveAndApplyTenant } from '@/lib/theme';
import { initI18n } from '@/lib/i18n';
import { initTracking, setUserContext } from '@/lib/tracking';

async function bootstrap() {
  // 0. Error-Tracking initialisieren (no-op wenn VITE_SENTRY_DSN nicht gesetzt — ELE-189)
  initTracking();

  // 1. JWT-Payload (falls vorhanden) für Tenant + Locale
  const token = getStoredToken();
  const payload = token ? decodeJwt(token) : null;

  // 2. Tenant-Theme anwenden (vor erstem Render → kein Flash)
  resolveAndApplyTenant(payload?.tenant);

  // 3. i18n initialisieren mit User-Locale (falls vorhanden)
  await initI18n(payload?.locale);

  // 4. Tracking-Kontext setzen (User-ID, Tenant, Rolle — keine PII)
  if (payload) {
    setUserContext({
      id: payload.userId,
      tenantId: payload.tenantId,
      role: payload.role,
    });
  }

  // 5. React mounten
  const rootEl = document.getElementById('root');
  if (!rootEl) {
    throw new Error('Missing #root element');
  }
  createRoot(rootEl).render(
    <StrictMode>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </StrictMode>
  );
}

void bootstrap();
