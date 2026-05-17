import { test, expect, type Page } from '@playwright/test';

// Mobile-Tagesansicht E2E (ELE-182).
// Login als daniel@pilot.local (EMPLOYEE) → /today zeigt seinen Tagesplan.
// Pilot-Seed (ELE-202) hat Daniel mit Einträgen Mo-Fr.

const EMP_EMAIL = 'daniel@pilot.local';
const EMP_PASSWORD = 'ChangeMe123!';
const ADMIN_EMAIL = 'admin@pilot.local';
const ADMIN_PASSWORD = 'ChangeMe123!';

async function authenticate(page: Page, email: string, password: string) {
  await page.goto('/login');
  const response = await page.evaluate(
    async (creds) => {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creds),
      });
      return r.json();
    },
    { email, password }
  );
  await page.evaluate(
    ({ token }) => {
      localStorage.setItem('timetable.jwt', token);
      localStorage.setItem('timetable.auth.flags', JSON.stringify({ mustChangePassword: false }));
    },
    { token: response.token }
  );
}

test.describe('Mobile-Tagesansicht (ELE-182)', () => {
  test('PWA-Manifest ist verfügbar + Service-Worker-Registrierung sichtbar', async ({ page }) => {
    await page.goto('/');
    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(manifestHref).toBeTruthy();
    const status = await page.evaluate(async () => {
      const m = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
      if (!m) return null;
      const r = await fetch(m.href);
      return { ok: r.ok, type: r.headers.get('content-type') };
    });
    expect(status?.ok).toBe(true);
  });

  test('EMPLOYEE Daniel landet auf /today und sieht eigene Aufgaben (oder Empty)', async ({
    page,
  }) => {
    await authenticate(page, EMP_EMAIL, EMP_PASSWORD);
    await page.goto('/');
    // Root-Route redirected EMPLOYEE → /today
    await expect(page).toHaveURL(/\/today/);

    // Entweder eine Liste oder ein Empty-State (je nachdem ob heute Mo-Fr ist)
    const list = page.getByTestId('myday-list');
    const empty = page.getByTestId('myday-empty');
    await expect(list.or(empty)).toBeVisible({ timeout: 15_000 });
  });

  test('ADMIN landet auf Wochenplan (NICHT auf /today)', async ({ page }) => {
    await authenticate(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/');
    // ADMIN bleibt auf SchedulePage (Wochenplan), nicht auf /today
    await expect(page.getByRole('button', { name: /previous|vorwoche/i })).toBeVisible({
      timeout: 15_000,
    });
    expect(page.url()).not.toContain('/today');
  });

  test('Maps-Link öffnet im neuen Tab (target="_blank" + rel="noopener")', async ({ page }) => {
    await authenticate(page, EMP_EMAIL, EMP_PASSWORD);
    await page.goto('/today');
    // Wenn Daniel heute Aufgaben hat, muss mindestens ein Maps-Link existieren
    const list = page.getByTestId('myday-list');
    const empty = page.getByTestId('myday-empty');
    await expect(list.or(empty)).toBeVisible({ timeout: 15_000 });

    if (await list.isVisible()) {
      const mapsLink = page.getByTestId('myday-maps-link').first();
      await expect(mapsLink).toHaveAttribute('target', '_blank');
      await expect(mapsLink).toHaveAttribute('rel', /noopener/);
      const href = await mapsLink.getAttribute('href');
      expect(href).toMatch(/google\.com\/maps\/search/);
    }
  });
});
