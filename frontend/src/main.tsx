import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/styles/index.css';
import { App } from '@/App';
import { decodeJwt } from '@/lib/jwt';
import { getStoredToken } from '@/lib/auth';
import { resolveAndApplyTenant } from '@/lib/theme';
import { initI18n } from '@/lib/i18n';

async function bootstrap() {
  // 1. JWT-Payload (falls vorhanden) für Tenant + Locale
  const token = getStoredToken();
  const payload = token ? decodeJwt(token) : null;

  // 2. Tenant-Theme anwenden (vor erstem Render → kein Flash)
  resolveAndApplyTenant(payload?.tenant);

  // 3. i18n initialisieren mit User-Locale (falls vorhanden)
  await initI18n(payload?.locale);

  // 4. React mounten
  const rootEl = document.getElementById('root');
  if (!rootEl) {
    throw new Error('Missing #root element');
  }
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

void bootstrap();
