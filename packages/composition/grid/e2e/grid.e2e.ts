import { expect, test, type Page } from "@playwright/test";

// Grid's browser-only fact is the reflow: `repeat(auto-fit, minmax(...))`
// recomputes the track list from the container's width, so the same demo
// renders a different number of columns as the viewport narrows — and the
// gap scale steps down a notch below Tailwind's `sm`. jsdom has no layout
// engine, so Grid.test.ts can pin the classes but never the track count.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=grid");
  await expect(page.getByText("Auto-fit grid").first()).toBeVisible();
});

/** The demo's first grid — the auto-fit one the reflow claim rides on. */
function autoFitGrid(page: Page) {
  return page.locator(".grid").first();
}

/** The resolved track widths; auto-fit turns `repeat(auto-fit, …)` into a
 *  concrete list the computed style is happy to hand over. */
async function trackCount(grid: ReturnType<typeof autoFitGrid>) {
  const template = await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns);
  return template.split(" ").filter(Boolean).length;
}

test("the auto-fit grid reflows to fewer columns as the viewport narrows", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 900 });
  const wide = await trackCount(autoFitGrid(page));

  await page.setViewportSize({ width: 360, height: 900 });
  const narrow = await trackCount(autoFitGrid(page));

  // The reflow is the contract, not any particular count: a tile's minimum
  // width is min(100%, …), so one column is a legal answer at the narrow
  // band — what may not happen is the wide count surviving down there.
  expect(narrow, "the narrow band must not keep the wide track list").toBeLessThan(wide);
  expect(narrow).toBeGreaterThanOrEqual(1);
});

test("the gap scale steps down below the sm band", async ({ page }) => {
  // The demo's gap="sm" instance: gap-2 sm:gap-3 — 12px above `sm`, 8px below.
  const gap = page.locator(".grid").nth(2);
  await page.setViewportSize({ width: 800, height: 900 });
  const above = await gap.evaluate((el) => Number.parseFloat(getComputedStyle(el).columnGap));
  await page.setViewportSize({ width: 360, height: 900 });
  const below = await gap.evaluate((el) => Number.parseFloat(getComputedStyle(el).columnGap));
  expect(below).toBeLessThan(above);
});
