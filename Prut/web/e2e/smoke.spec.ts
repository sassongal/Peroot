import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('homepage loads and has correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Peroot/);
  });

  test('pricing page loads', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('blog page loads', async ({ page }) => {
    await page.goto('/blog');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('contact page loads with correct heading', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.locator('h1')).toContainText('צור קשר');
  });

  test('examples page loads', async ({ page }) => {
    await page.goto('/examples');
    await expect(page.locator('h1')).toBeVisible();
  });
});
