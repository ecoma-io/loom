import { expect, test, type Locator, type Page } from "@playwright/test";

// FormSection's browser-only fact is the band-scale of its field spacing:
// the Stack gap between fields steps one notch below `sm`, so the same
// `gap="md"` section resolves 16px between fields on a desktop and 12px on a
// phone. jsdom has no cascade, so FormSection.test.ts can pin the class
// pair but never the computed gap.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=form-section");
  await expect(page.getByText("Shipping address")).toBeVisible();
});

/** The demo's first section (`gap="md"`): its field stack — the element the
 *  gap class lives on, reached as the parent of its first field. */
function fieldStack(page: Page): Locator {
  return page.getByText("Street address").locator("..");
}

test('the gap="md" fields resolve 16px apart past sm and 12px below it', async ({ page }) => {
  const stack = fieldStack(page);
  await page.setViewportSize({ width: 800, height: 900 });
  const above = await stack.evaluate((el) => Number.parseFloat(getComputedStyle(el).rowGap));
  await page.setViewportSize({ width: 360, height: 900 });
  const below = await stack.evaluate((el) => Number.parseFloat(getComputedStyle(el).rowGap));
  // gap-3 sm:gap-4 — the step, not two guesses.
  expect(above).toBe(16);
  expect(below).toBe(12);
});
