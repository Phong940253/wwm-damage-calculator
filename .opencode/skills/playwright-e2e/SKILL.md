---
name: playwright-e2e
description: Writing and running Playwright E2E tests for the web app
---

# Playwright E2E — WWM Damage Calculator

Use when writing or running end-to-end tests.

## Setup

Playwright is already in `package.json`. Install browsers:

```bash
pnpm exec playwright install chromium
```

## Config

`playwright.config.ts` at project root:
- Test directory: `./e2e`
- Base URL: `http://localhost:3000`
- `reuseExistingServer: true` — nếu port 3000 đã chạy thì không khởi động lại
- Browser: Chromium (Desktop Chrome)

## Commands

```bash
pnpm exec playwright test              # Run all e2e tests (headless)
pnpm exec playwright test --ui         # Run with UI mode
pnpm exec playwright test --debug      # Debug with inspector
pnpm exec playwright test e2e/example.spec.ts  # Single file
pnpm exec playwright show-report       # View HTML report
```

## Available Selectors (`data-tour` attributes)

Many UI elements have `data-tour` attributes for easy selecting:

| Selector | Element |
|----------|---------|
| `[data-tour='tab-main-root']` | Main tab button |
| `[data-tour='tab-gear-root']` | Gear tab button |
| `[data-tour='tab-stats']` | Stats subtab |
| `[data-tour='tab-rotation']` | Rotation subtab |
| `[data-tour='player-level']` | Player level input |
| `[data-tour='martial-art']` | Martial art selector |
| `[data-tour='stat-input']` | First stat input (Agility) |
| `[data-tour='gear-add-open']` | Add Gear button |
| `[data-tour='gear-ocr']` | OCR button in gear form |
| `[data-tour='gear-add-submit']` | Submit gear form |
| `[data-tour='gear-optimize-open']` | Open optimizer button |
| `[data-tour='gear-optimize-recalculate']` | Recalculate button in optimizer |
| `[data-tour='gear-optimize-progress']` | Progress indicator |
| `[data-tour='gear-optimize-equip']` | Equip button for a result |

## Test Patterns

### Navigation & basic smoke
```ts
test("page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-tour='tab-main-root']")).toBeVisible();
});
```

### Dialog interaction
```ts
test("open gear form", async ({ page }) => {
  await page.goto("/");
  await page.locator("[data-tour='tab-gear-root']").click();
  await page.locator("[data-tour='gear-add-open']").click();
  await expect(page.locator("[data-tour='gear-ocr']")).toBeVisible();
});
```

## Tips
- Dùng `data-tour` selectors thay vì text — ổn định hơn khi đổi ngôn ngữ
- Test trong `e2e/` dùng Playwright API, không dùng vitest
- Nếu dev server chưa chạy, Playwright tự động chạy `pnpm dev` (nhờ `reuseExistingServer`)
- Thêm `--project=chromium` nếu muốn chạy đúng browser
