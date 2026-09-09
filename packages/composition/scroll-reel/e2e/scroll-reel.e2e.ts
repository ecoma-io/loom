import { expect, test, type Locator, type Page } from "@playwright/test";

// ScrollReel's browser-only fact is the overflow contract: the strip stays
// ONE line and the container scrolls instead of wrapping or stretching the
// page. jsdom has no overflow, so ScrollReel.test.ts can pin the classes but
// never the scrollWidth that makes the reel real.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=scroll-reel");
  await expect(page.getByText("Snap to start")).toBeVisible();
});

/** The demo's first reel — eight fixed-width cards under `snap="start"`. */
function reel(page: Page): Locator {
  return page.locator(".overflow-x-auto").first();
}

test("the strip stays one line and overflows into a reel at every band", async ({ page }) => {
  for (const width of [360, 800]) {
    await page.setViewportSize({ width, height: 900 });
    const strip = reel(page);
    await expect(strip).toBeVisible();
    const { scrolled, rows } = await strip.evaluate((el) => {
      const boxes = [...el.children].map((child) => child.getBoundingClientRect().y);
      return {
        // Content wider than the box is the whole point: the reel has
        // somewhere to scroll to.
        scrolled: el.scrollWidth > el.clientWidth,
        // One line: every card shares the strip's first row.
        rows: new Set(boxes.map((y) => Math.round(y))).size,
      };
    });
    expect(scrolled, `scrollWidth must exceed clientWidth at ${String(width)}px`).toBe(true);
    expect(rows, `every card must share one row at ${String(width)}px`).toBe(1);
  }
});

test("the gap scale steps down below the sm band", async ({ page }) => {
  const strip = reel(page);
  await page.setViewportSize({ width: 800, height: 900 });
  const above = await strip.evaluate((el) => Number.parseFloat(getComputedStyle(el).columnGap));
  await page.setViewportSize({ width: 360, height: 900 });
  const below = await strip.evaluate((el) => Number.parseFloat(getComputedStyle(el).columnGap));
  // gap="md": gap-3 sm:gap-4 — 16px above `sm`, 12px below.
  expect(below).toBeLessThan(above);
});
