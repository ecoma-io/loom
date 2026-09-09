import { expect, test, type Locator, type Page } from "@playwright/test";

// Sidebar's browser-only fact is the intrinsic collapse: the flex-wrap row
// wraps on the container's own width — no media query — and which panel the
// stacked order puts on top is decided by DOCUMENT order (ecoma-io/loom#158).
// jsdom can assert the DOM order (Sidebar.test.ts) but not which stacked
// panel the browser paints above.
//
// Nothing here pins the wrapped sidebar's width: ecoma-io/loom#275 is open
// on purpose, and the wrapped panel's width is the open question.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=sidebar");
  await expect(page.getByText("Sidebar on the left")).toBeVisible();
});

/**
 * The demo's first instance's flex-wrap row (client-side render serializes
 * the style object as `flex-wrap: wrap`, with the space — match the property
 * name only, the split spec's lesson).
 */
function row(page: Page): Locator {
  return page.locator('[style*="flex-wrap:"]').first();
}

/** The panel's rendered box, or a hard failure. */
async function boxOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("expected the sidebar panel to be rendered and visible");
  return box;
}

test("the side panel stacks above the content when collapsed, beside it when there is room", async ({
  page,
}) => {
  // Narrow band: the content's min-width cannot be satisfied alongside the
  // side panel, so the row wraps — side first, content below (document order
  // for the default side="left").
  await page.setViewportSize({ width: 360, height: 900 });
  const side = row(page).locator("> div").first();
  const content = row(page).locator("> div").nth(1);
  const sideBox = await boxOf(side);
  const contentBox = await boxOf(content);
  expect(sideBox.y + sideBox.height).toBeLessThanOrEqual(contentBox.y + 1);

  // Mid band: side by side, sidebar on the left.
  await page.setViewportSize({ width: 800, height: 900 });
  const sideWide = row(page).locator("> div").first();
  const contentWide = row(page).locator("> div").nth(1);
  const sideWideBox = await boxOf(sideWide);
  const contentWideBox = await boxOf(contentWide);
  expect(contentWideBox.x).toBeGreaterThanOrEqual(sideWideBox.x + sideWideBox.width - 1);
});
