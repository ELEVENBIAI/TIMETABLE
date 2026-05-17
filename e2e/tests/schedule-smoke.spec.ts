import { test, expect } from '@playwright/test';

// Schedule E2E (ELE-180). Voraussetzt:
// - Backend läuft auf :3000 mit Pilot-Seed (ELE-202)
// - admin@pilot.local mit ChangeMe123!
// - frontend dev server (über playwright webServer)

const ADMIN_EMAIL = 'admin@pilot.local';
const ADMIN_PASSWORD = 'ChangeMe123!';

/** Holt einen JWT direkt vom Backend und setzt ihn in localStorage,
 *  damit wir nicht durch den Login-Flow + Forced-Change-Password müssen. */
async function authenticate(page: import('@playwright/test').Page) {
  // Erst zur Login-Seite navigieren um localStorage-Origin zu setzen
  await page.goto('/login');

  const response = await page.evaluate(
    async ({ email, password }) => {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      return r.json();
    },
    { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }
  );

  // JWT setzen + mustChangePassword-Flag ausschalten (Test überspringt den Forced-Flow)
  await page.evaluate(
    ({ token }) => {
      localStorage.setItem('timetable.jwt', token);
      localStorage.setItem('timetable.auth.flags', JSON.stringify({ mustChangePassword: false }));
    },
    { token: response.token }
  );
}

test.describe('Schedule page (ELE-180)', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('rendert KW-Navigator + ViewMode-Switcher mit Demo-Schedule', async ({ page }) => {
    await page.goto('/schedule?week=2026-05-18');

    // KW-Navigator sichtbar
    await expect(page.getByRole('button', { name: /previous|vorwoche/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('button', { name: /next|nächste/i })).toBeVisible();

    // ViewMode-Switcher
    await expect(page.getByRole('tab', { name: /^team$/i })).toBeVisible();

    // Status-Badge: DRAFT (Pilot-Seed hat DRAFT-Schedule für KW 21/2026)
    await expect(page.getByText(/draft|entwurf/i).first()).toBeVisible();
  });

  test('zeigt Entry-Cards aus dem Pilot-Seed', async ({ page }) => {
    await page.goto('/schedule?week=2026-05-18');

    // ELE-202 Seed hat 16 Schedule-Entries Mo-Fr. Wir prüfen dass mindestens
    // eine Entry-Card via data-attribute existiert.
    await expect(page.locator('[data-entry-id]').first()).toBeVisible({ timeout: 15_000 });
    const count = await page.locator('[data-entry-id]').count();
    expect(count).toBeGreaterThan(0);
  });

  test('Empty-State für Woche ohne Plan', async ({ page }) => {
    // KW 1 2023 hat garantiert keinen Plan (vor allen Tests).
    await page.goto('/schedule?week=2023-01-02');

    // Empty-State zeigt Generate-Button
    await expect(page.getByRole('button', { name: /generate|generieren/i })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('KW-Navigation: Nächste-Button ändert URL', async ({ page }) => {
    await page.goto('/schedule?week=2026-05-18');
    await page.getByRole('button', { name: /next|nächste/i }).click({ timeout: 15_000 });
    await expect(page).toHaveURL(/week=2026-05-25/);
  });

  test('ViewMode-Switch: Tag-Mode aktivierbar', async ({ page }) => {
    await page.goto('/schedule?week=2026-05-18');
    // Tag-Tab matched 'Tag' (DE) oder 'Per day' (EN)
    const tagTab = page.getByRole('tab', { name: /^Tag$|Per day/i });
    await tagTab.click({ timeout: 15_000 });
    await expect(tagTab).toHaveAttribute('aria-selected', 'true');
  });
});
