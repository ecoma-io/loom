import { expect, test, type Locator, type Page } from "@playwright/test";

// Split's browser-only fact is the intrinsic collapse: when the combined
// min-width of both panels exceeds the container, the row wraps and the
// second panel lands on a new line. Which panel is "second" is decided by
// DOCUMENT order, so `side="right"` must render content first — the wrapped
// stack then reads content-above-panel instead of panel-above-content
// (ecoma-io/loom#158). jsdom can assert that DOM order (Split.test.ts) but
// not which of the two stacked panels the browser paints on top.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=split");
  await expect(page.getByText("Side on the right")).toBeVisible();
});

/** The demo's `side="right"` instance: its flex-wrap row. */
function rightRow(page: Page) {
  return page.locator('[style*="flex-wrap:wrap"]').filter({ hasText: "Right panel" });
}

/** The panel's rendered box, or a hard failure: a missing box is a layout
 *  defect, not a value to paper over. */
async function boxOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error("expected the split panel to be rendered and visible");
  }
  return box;
}

test("right-side variant stacks content above the panel when collapsed, and keeps the panel on the right when wide", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  const row = rightRow(page);
  // Document order for `side="right"`: content first, panel second — the
  // order that makes the wrap produce content-above-panel.
  const content = row.locator("> div").first();
  const panel = row.locator("> div").nth(1);
  const contentBox = await boxOf(content);
  const panelBox = await boxOf(panel);
  // Wrapped: the content's whole box sits above the panel's (1px tolerance
  // for sub-pixel rounding at fractional viewport widths).
  expect(contentBox.y + contentBox.height).toBeLessThanOrEqual(panelBox.y + 1);

  await page.setViewportSize({ width: 1024, height: 900 });
  const rowWide = rightRow(page);
  const contentWide = rowWide.locator("> div").first();
  const panelWide = rowWide.locator("> div").nth(1);
  const contentWideBox = await boxOf(contentWide);
  const panelWideBox = await boxOf(panelWide);
  // Side by side: the panel sits to the right of the content.
  expect(panelWideBox.x).toBeGreaterThan(contentWideBox.x + contentWideBox.width - 1);
});
