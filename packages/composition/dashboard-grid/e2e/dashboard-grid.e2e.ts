import { expect, test, type Locator, type Page } from "@playwright/test";

// DashboardGrid's browser-only fact is the span arithmetic: the demo's two
// wide panels carry `sm:col-span-2`, so once the grid has room for more than
// one track they span two of them — and below `sm` the same panels occupy a
// single track like every KPI tile. jsdom can pin the classes; only a real
// layout can say what a span resolves to.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=dashboard-grid");
  await expect(page.getByText("Orders today")).toBeVisible();
});

/** A KPI tile — the single-track reference every span is judged against.
 *  The text sits two levels under the Surface that is the tile. */
function kpiTile(page: Page): Locator {
  return page.locator("#app").getByText("Orders today").locator("../..");
}

/** The demo's first `sm:col-span-2` panel, two levels under its Surface. */
function widePanel(page: Page): Locator {
  return page.locator("#app").getByText("Recent activity").locator("../..");
}

/** The span panel's rendered box, or a hard failure. */
async function boxOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("expected the panel to be rendered and visible");
  return box;
}

test("the span-2 panels occupy one track below sm and two tracks above it", async ({ page }) => {
  // Narrow band: one column exists, so a two-track span cannot — the panel
  // must be exactly as wide as a KPI tile.
  await page.setViewportSize({ width: 360, height: 900 });
  const tileNarrow = await boxOf(kpiTile(page));
  const panelNarrow = await boxOf(widePanel(page));
  expect(Math.abs(panelNarrow.width - tileNarrow.width)).toBeLessThanOrEqual(1);

  // Mid band: well past `sm`, with room for several 14rem tracks — the span
  // resolves and the panel overtakes the single-track tile.
  await page.setViewportSize({ width: 800, height: 900 });
  const tileWide = await boxOf(kpiTile(page));
  const panelWide = await boxOf(widePanel(page));
  expect(panelWide.width).toBeGreaterThan(tileWide.width * 1.5);
});
