import { expect, test, type Locator, type Page } from "@playwright/test";

// Settings' browser-only fact is the intrinsic collapse it shares with the
// Sidebar composition: the nav+content row wraps on the container's own
// min-widths, so the nav stacks above the content with no media query. jsdom
// can pin the classes and the slot order (Settings.test.ts) but not which
// stacked panel the browser paints above.
//
// Nothing here pins the wrapped nav's width — ecoma-io/loom#275 is open on
// purpose, and the width a wrapped panel keeps is the open question.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=settings");
  await expect(page.getByText("With header").first()).toBeVisible();
});

/** The demo's first instance: its flex-wrap row (client-side render keeps the
 *  space after the colon — match the property name only). */
function row(page: Page): Locator {
  return page.locator('[style*="flex-wrap:"]').first();
}

/** The panel's rendered box, or a hard failure. */
async function boxOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("expected the settings panel to be rendered and visible");
  return box;
}

test("the nav stacks above the content when collapsed, beside it when there is room", async ({
  page,
}) => {
  // Locators re-resolve on every use, so one pair of handles reads both bands.
  const nav = row(page).locator("> nav");
  const content = row(page).locator("> div").last();

  // Narrow band: the content's min-width: 50% cannot be satisfied alongside
  // the nav's 12rem basis, so the row wraps — nav first, content below
  // (document order).
  await page.setViewportSize({ width: 360, height: 900 });
  const navBox = await boxOf(nav);
  const contentBox = await boxOf(content);
  expect(navBox.y + navBox.height).toBeLessThanOrEqual(contentBox.y + 1);

  // Mid band: side by side, nav on the left.
  await page.setViewportSize({ width: 800, height: 900 });
  const navWideBox = await boxOf(nav);
  const contentWideBox = await boxOf(content);
  expect(contentWideBox.x).toBeGreaterThanOrEqual(navWideBox.x + navWideBox.width - 1);
});
