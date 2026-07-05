import { test, expect } from "@playwright/test";

test("page loads and shows main tabs", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-tour='tab-main-root']")).toBeVisible();
  await expect(page.locator("[data-tour='tab-gear-root']")).toBeVisible();
});

test("can navigate to stats tab and see player level input", async ({ page }) => {
  await page.goto("/");
  await page.locator("[data-tour='tab-stats']").click();
  await expect(page.locator("[data-tour='player-level']")).toBeVisible();
});

test("can navigate to gear tab and open add gear dialog", async ({ page }) => {
  await page.goto("/");
  await page.locator("[data-tour='tab-gear-root']").click();
  await page.locator("[data-tour='gear-add-open']").click();
  await expect(page.locator("[data-tour='gear-ocr']")).toBeVisible();
});
