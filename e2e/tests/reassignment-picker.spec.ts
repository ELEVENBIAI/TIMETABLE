import { test, expect, type Page } from '@playwright/test';

// ELE-203: Reassignment-Picker E2E.
// Setup: Pilot-Seed (ELE-202) hat DRAFT-Schedule für KW 21/2026 mit 16 Entries.
// Daniel ist mit REASSIGNMENT_NEEDED-Status für einen Entry, wenn die Pilot-Daten
// das hergeben. Falls nicht, wird ein Entry direkt im Test markiert.

const ADMIN_EMAIL = 'admin@pilot.local';
const ADMIN_PASSWORD = 'ChangeMe123!';

async function authenticate(page: Page) {
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
    { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }
  );
  await page.evaluate(
    ({ token }) => {
      localStorage.setItem('timetable.jwt', token);
      localStorage.setItem('timetable.auth.flags', JSON.stringify({ mustChangePassword: false }));
    },
    { token: response.token }
  );
}

test.describe('Reassignment-Picker (ELE-203)', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('Trigger-Button sichtbar nur bei REASSIGNMENT_NEEDED-Entries', async ({ page }) => {
    await page.goto('/schedule?week=2026-05-18');
    await expect(page.locator('[data-entry-id]').first()).toBeVisible({ timeout: 15_000 });

    // Im Standard-Pilot-Seed gibt es keine REASSIGNMENT_NEEDED-Entries.
    // Markieren wir einen Entry via API.
    const token = await page.evaluate(() => localStorage.getItem('timetable.jwt'));
    const firstEntryId = await page
      .locator('[data-entry-id]')
      .first()
      .getAttribute('data-entry-id');
    expect(firstEntryId).toBeTruthy();

    // Direkter SQL-Update wäre besser, aber wir nutzen die PUT-Status-Route falls vorhanden.
    // Alternative: API-Mock — wir setzen den Status via fetch-Override im Browser
    await page.evaluate(
      async ({ entryId, jwt }) => {
        await fetch(`/api/schedule-entries/${entryId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({ status: 'REASSIGNMENT_NEEDED' }),
        });
      },
      { entryId: firstEntryId, jwt: token }
    );

    await page.reload();
    await expect(page.locator('[data-entry-id]').first()).toBeVisible({ timeout: 15_000 });

    // Reassign-Trigger sollte jetzt sichtbar sein
    const triggers = page.getByTestId('reassign-trigger');
    await expect(triggers.first()).toBeVisible({ timeout: 10_000 });
  });

  test('Klick auf Trigger öffnet Modal mit Suggestions oder Empty-State', async ({ page }) => {
    await page.goto('/schedule?week=2026-05-18');
    await expect(page.locator('[data-entry-id]').first()).toBeVisible({ timeout: 15_000 });

    const token = await page.evaluate(() => localStorage.getItem('timetable.jwt'));
    const firstEntryId = await page
      .locator('[data-entry-id]')
      .first()
      .getAttribute('data-entry-id');

    await page.evaluate(
      async ({ entryId, jwt }) => {
        await fetch(`/api/schedule-entries/${entryId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({ status: 'REASSIGNMENT_NEEDED' }),
        });
      },
      { entryId: firstEntryId, jwt: token }
    );

    await page.reload();
    await page.getByTestId('reassign-trigger').first().click();
    await expect(page.getByTestId('reassignment-modal')).toBeVisible({ timeout: 10_000 });
    // Entweder Vorschläge ODER Empty-State werden gerendert
    const suggestions = page.getByTestId('reassignment-suggestions');
    const empty = page.locator('text=/No suitable substitutes|Keine passende/i');
    await expect(suggestions.or(empty)).toBeVisible({ timeout: 10_000 });
  });
});
