import { test, expect, type Page } from '@playwright/test';

// DSGVO E2E (ELE-187):
// - Self-Service Datenexport als EMPLOYEE
// - Audit-Trail-Page als ADMIN

const ADMIN_EMAIL = 'admin@pilot.local';
const ADMIN_PASSWORD = 'ChangeMe123!';
const EMP_EMAIL = 'daniel@pilot.local';
const EMP_PASSWORD = 'ChangeMe123!?';

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

test.describe('DSGVO Self-Service-Export (ELE-187)', () => {
  test('EMPLOYEE kann seine Daten als ZIP herunterladen', async ({ page }) => {
    await authenticate(page, EMP_EMAIL, EMP_PASSWORD);
    await page.goto('/settings/data-export');

    await expect(page.getByTestId('data-export-button')).toBeVisible({ timeout: 15_000 });

    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('data-export-button').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/meine-daten-.*\.zip/);
  });
});

test.describe('DSGVO Audit-Trail (ELE-187)', () => {
  test('ADMIN sieht Audit-Trail mit Tabellen-Header', async ({ page }) => {
    await authenticate(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/settings/audit-trail');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('audit-csv-export')).toBeVisible();
    await expect(page.getByTestId('audit-table-body')).toBeVisible();
  });

  test('ADMIN kann CSV exportieren', async ({ page }) => {
    await authenticate(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/settings/audit-trail');
    await expect(page.getByTestId('audit-csv-export')).toBeVisible({ timeout: 15_000 });

    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('audit-csv-export').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('audit-log.csv');
  });
});
