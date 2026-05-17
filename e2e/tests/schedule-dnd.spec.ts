import { test, expect, type Page } from '@playwright/test';

// Drag-&-Drop E2E (ELE-181).
// Setup: Authentifizierung via direkt-JWT (siehe schedule-smoke), Pilot-Seed (ELE-202) ist aktiv.

const ADMIN_EMAIL = 'admin@pilot.local';
const ADMIN_PASSWORD = 'ChangeMe123!';

async function authenticate(page: Page) {
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
  await page.evaluate(
    ({ token }) => {
      localStorage.setItem('timetable.jwt', token);
      localStorage.setItem('timetable.auth.flags', JSON.stringify({ mustChangePassword: false }));
    },
    { token: response.token }
  );
}

test.describe('Schedule Drag&Drop (ELE-181)', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('Cards haben data-draggable=true im DRAFT-Status', async ({ page }) => {
    await page.goto('/schedule?week=2026-05-18');
    await expect(page.locator('[data-entry-id]').first()).toBeVisible({ timeout: 15_000 });

    const firstCard = page.locator('[data-entry-id]').first();
    await expect(firstCard).toHaveAttribute('data-draggable', 'true');
  });

  test('Tag-Spalten sind als Droppable markiert', async ({ page }) => {
    await page.goto('/schedule?week=2026-05-18');
    await expect(page.locator('[data-entry-id]').first()).toBeVisible({ timeout: 15_000 });

    const buckets = page.locator('[data-droppable="true"]');
    const count = await buckets.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Drag von einer Card auf einen anderen Bucket persistiert nach Reload', async ({ page }) => {
    await page.goto('/schedule?week=2026-05-18');
    await expect(page.locator('[data-entry-id]').first()).toBeVisible({ timeout: 15_000 });

    // Erste Card eines Mitarbeiters greifen
    const sourceCard = page.locator('[data-entry-id]').first();
    const entryId = await sourceCard.getAttribute('data-entry-id');
    expect(entryId).toBeTruthy();

    // Aktueller Mitarbeiter dieser Card (Parent-Bucket data-employee)
    const sourceEmployee = await sourceCard
      .locator('xpath=ancestor::*[@data-employee][1]')
      .getAttribute('data-employee');

    // Ziel: ein Bucket mit anderem Mitarbeiter, gleicher Tag (data-day)
    const sourceDay = await sourceCard.getAttribute('data-day');
    const targetBucket = page
      .locator(
        `[data-droppable="true"][data-day="${sourceDay}"][data-employee]:not([data-employee="${sourceEmployee}"])`
      )
      .first();
    await expect(targetBucket).toBeVisible();

    // Drag&Drop via Playwright (mouse-down → move → up)
    await sourceCard.hover();
    await page.mouse.down();
    const box = await targetBucket.boundingBox();
    if (!box) throw new Error('Target bucket has no bounding box');
    // Erst 1-Pixel-Move (dnd-kit aktivierungs-distance) dann zum Ziel
    await page.mouse.move(box.x + 10, box.y + 10, { steps: 4 });
    await page.mouse.move(box.x + box.width / 2, box.y + 40, { steps: 8 });
    await page.mouse.up();

    // Nach Reload muss die Card im neuen Bucket sein
    await page.waitForTimeout(500);
    await page.reload();
    await expect(page.locator(`[data-entry-id="${entryId}"]`)).toBeVisible({ timeout: 15_000 });
    const movedEmployee = await page
      .locator(`[data-entry-id="${entryId}"]`)
      .locator('xpath=ancestor::*[@data-employee][1]')
      .getAttribute('data-employee');

    // Entweder erfolgreicher Move (movedEmployee !== sourceEmployee)
    // oder Conflict-Alert → Card zurück (Toleranz für seeds mit volleren Zeiten)
    if (movedEmployee === sourceEmployee) {
      // Conflict-Alert zeigt Banner
      const conflictAlert = page.getByRole('alert').filter({ hasText: /conflict|konflikt/i });
      await expect(conflictAlert.first()).toBeVisible({ timeout: 1000 });
    } else {
      expect(movedEmployee).not.toBe(sourceEmployee);
    }
  });
});
