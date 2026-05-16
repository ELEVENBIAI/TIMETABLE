import { expect, test } from '@playwright/test';

// Smoke-Test ohne Backend/Frontend — prüft nur dass Playwright initialisiert ist
// und Browser-Engines starten.
//
// Sobald TT-15 (Mobile-PWA) live ist, wird hier ein echter Page-Load gegen baseURL geprüft.

test.describe('Playwright Smoke', () => {
  test('Browser kann data:URL laden', async ({ page }) => {
    await page.goto('data:text/html,<html><body><h1>Timetable</h1></body></html>');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Timetable');
  });

  test('JavaScript-Execution im Browser funktioniert', async ({ page }) => {
    await page.goto('data:text/html,<html><body></body></html>');
    const result = await page.evaluate(() => 2 + 2);
    expect(result).toBe(4);
  });
});
