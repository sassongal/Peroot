import { test, expect } from "@playwright/test";

test.describe("Site search (home)", () => {
  test("search combobox is visible on homepage", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("combobox", { name: "חיפוש באתר" })).toBeVisible();
  });

  test("opening search overlay after typing", async ({ page }) => {
    await page.goto("/");
    const input = page.getByRole("combobox", { name: "חיפוש באתר" });
    await input.fill("בלוג");
    await expect(page.getByRole("dialog", { name: "תוצאות חיפוש" })).toBeVisible();
  });
});
