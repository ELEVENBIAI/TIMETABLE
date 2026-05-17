import { test, expect } from '@playwright/test';

test.describe('Frontend bootstrap + Auth smoke', () => {
  test('unauthenticated user is redirected to /login', async ({ page }) => {
    await page.goto('/');
    // ProtectedRoute redirected → /login?from=%2F
    await page.waitForURL(/\/login/);
    await expect(page.getByText(/Sign in|Anmelden/i).first()).toBeVisible();
  });

  test('login page shows form (email + password + submit + forgot)', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/^password|^passwort/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in|anmelden/i })).toBeVisible();
    await expect(page.getByText(/forgot password|passwort vergessen/i)).toBeVisible();
  });

  test('language switcher toggles to German on login page', async ({ page }) => {
    await page.goto('/login');
    const select = page.getByRole('combobox', { name: /Language|Sprache/i });
    await select.selectOption('de');
    await expect(page.getByText(/anmelden/i).first()).toBeVisible();
  });

  test('forgot-password page is reachable from login', async ({ page }) => {
    await page.goto('/login');
    await page.getByText(/forgot password|passwort vergessen/i).click();
    await page.waitForURL(/\/forgot-password/);
    await expect(page.getByText(/reset password|passwort zur/i)).toBeVisible();
  });

  test('forgot-password submit shows generic success (anti-enumeration)', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByLabel(/email/i).fill('ghost@example.local');
    await page.getByRole('button', { name: /send reset|link senden/i }).click();
    await expect(page.getByText(/if we know|falls wir/i)).toBeVisible({ timeout: 10_000 });
  });
});
