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
// The harness drives the Vite dev server (client-side render), where Vue
// serializes the style object as `flex-wrap: wrap` — WITH the space, unlike
// the space-less SSR form the root suite's FLEX_WRAP selector targets. Match
// the property name only so both spellings find the row.
function rightRow(page: Page) {
  return page.locator('[style*="flex-wrap:"]').filter({ hasText: "Right panel" });
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
  // The responsive contract's narrow band: the demo's 14rem panel plus the
  // content's 50% floor cannot share it.
  await page.setViewportSize({ width: 360, height: 900 });
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

  // The mid band: comfortably past the collapse, so the row is one line.
  await page.setViewportSize({ width: 800, height: 900 });
  const rowWide = rightRow(page);
  const contentWide = rowWide.locator("> div").first();
  const panelWide = rowWide.locator("> div").nth(1);
  const contentWideBox = await boxOf(contentWide);
  const panelWideBox = await boxOf(panelWide);
  // Side by side: the panel sits to the right of the content.
  expect(panelWideBox.x).toBeGreaterThan(contentWideBox.x + contentWideBox.width - 1);
});

test("the row's gap steps with the sm band", async ({ page }) => {
  // The default `gap="md"` resolves to `gap-3 sm:gap-4`: 12px below `sm`,
  // 16px at or above it — the band-scale word on the composition's claim.
  await page.setViewportSize({ width: 360, height: 900 });
  const narrowGap = await rightRow(page).evaluate((el) =>
    Number.parseFloat(getComputedStyle(el).columnGap),
  );
  expect(narrowGap).toBe(12);

  await page.setViewportSize({ width: 800, height: 900 });
  const midGap = await rightRow(page).evaluate((el) =>
    Number.parseFloat(getComputedStyle(el).columnGap),
  );
  expect(midGap).toBe(16);
});

test("the intrinsic collapse lands between the contract's narrow and mid bands", async ({
  page,
}) => {
  // The same facts at the responsive contract's canonical bands: the demo's
  // 14rem panel plus the content's 50% floor cannot share a 360px line but
  // fits a 800px one, so the wrap falls between the two.
  const row = rightRow(page);
  const content = row.locator("> div").first();
  const panel = row.locator("> div").nth(1);

  await page.setViewportSize({ width: 360, height: 900 });
  const contentBox = await boxOf(content);
  const panelBox = await boxOf(panel);
  expect(contentBox.y + contentBox.height).toBeLessThanOrEqual(panelBox.y + 1);

  await page.setViewportSize({ width: 800, height: 900 });
  const contentWideBox = await boxOf(content);
  const panelWideBox = await boxOf(panel);
  expect(panelWideBox.x).toBeGreaterThan(contentWideBox.x + contentWideBox.width - 1);
});
