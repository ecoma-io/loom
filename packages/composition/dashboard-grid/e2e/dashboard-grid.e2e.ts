import { expect, test, type Locator, type Page } from "@playwright/test";

// DashboardGrid's browser-only facts are the span arithmetic and the reflow:
// the demo's two wide panels carry `sm:col-span-2`, so once the grid has room
// for more than one track they span two of them — and below `sm` the same
// panels occupy a single track like every KPI tile; the track COUNT itself is
// computed by `repeat(auto-fit, minmax(...))` from the container's width, not
// authored anywhere. jsdom can pin the classes; only a real layout can say
// what a span resolves to and how many tracks the container was given.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=dashboard-grid");
  await expect(page.getByText("Orders today")).toBeVisible();
});

/**
 * A KPI tile — the single-track reference every span is judged against. The
 * demo nests the KPI label DIRECTLY in the Surface that is the tile, so one
 * `..` lands on it. (The wide panel below needs two: its heading sits in a
 * flex row inside the Surface — the two locators are deliberately not
 * symmetric and must not be "fixed" into symmetry.)
 */
function kpiTile(page: Page): Locator {
  return page.locator("#app").getByText("Orders today").locator("..");
}

/** The demo's first `sm:col-span-2` panel, two levels under its Surface. */
function widePanel(page: Page): Locator {
  return page.locator("#app").getByText("Recent activity").locator("../..");
}

/** The grid the demo lays its tiles into. */
function grid(page: Page): Locator {
  return page.locator("#app .grid").first();
}

/** The resolved track widths; auto-fit turns `repeat(auto-fit, …)` into a
 *  concrete list the computed style is happy to hand over. */
async function trackCount(of: Locator): Promise<number> {
  const template = await of.evaluate((el) => getComputedStyle(el).gridTemplateColumns);
  return template.split(" ").filter(Boolean).length;
}

/** The rendered box, or a hard failure. */
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
  // And the count really is computed: min(100%, 14rem) tracks on a ~336px
  // container resolve to one, not to an authored column count.
  expect(await trackCount(grid(page)), "one track at the narrow band").toBe(1);

  // Mid band: well past `sm`, with room for several 14rem tracks — the span
  // resolves and the panel overtakes the single-track tile. (800 + one 16px
  // gap) / (224px tile + 16px gap) = 3.4 → three tracks for the panel to
  // span two of.
  await page.setViewportSize({ width: 800, height: 900 });
  const tileWide = await boxOf(kpiTile(page));
  const panelWide = await boxOf(widePanel(page));
  expect(panelWide.width).toBeGreaterThan(tileWide.width * 1.5);
  expect(await trackCount(grid(page)), "three tracks at the mid band").toBe(3);
});

test("the gap scale steps down below the sm band", async ({ page }) => {
  // The demo's gap="md": gap-3 sm:gap-4 — 12px below `sm`, 16px at it and up.
  await page.setViewportSize({ width: 800, height: 900 });
  const above = await grid(page).evaluate((el) =>
    Number.parseFloat(getComputedStyle(el).columnGap),
  );
  expect(above).toBe(16);

  await page.setViewportSize({ width: 360, height: 900 });
  const below = await grid(page).evaluate((el) =>
    Number.parseFloat(getComputedStyle(el).columnGap),
  );
  expect(below).toBe(12);
});
