import { test, expect } from '@playwright/test';

test.describe('Frontend bootstrap smoke', () => {
  test('app shell renders and shows health status', async ({ page }) => {
    await page.goto('/');

    // Brand + Title sichtbar
    await expect(page.getByText('Timetable').first()).toBeVisible();

    // HealthPage rendert. Status-Text ist abhängig davon, ob das Backend läuft.
    // Wir akzeptieren alle drei Endzustände — Schlüssel ist: kein JS-Crash.
    await expect(
      page.getByText(/Backend|System|Unreachable|Reachable|verbunden|nicht erreichbar/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('language switcher toggles to German', async ({ page }) => {
    await page.goto('/');
    const select = page.getByRole('combobox', { name: /Language|Sprache/i });
    await select.selectOption('de');
    // Nach Locale-Switch erscheint der deutsche Titel der HealthPage
    await expect(page.getByText(/Systemstatus|Backend wird gepr/i).first()).toBeVisible();
  });

  test('navigates to login placeholder', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText(/Sign in|Anmelden/i)).toBeVisible();
  });
});
