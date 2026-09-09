import { expect, test, type Locator, type Page } from "@playwright/test";

// Dashboard's browser-only facts are three, and each lives in a different
// behaviour word:
//
// - intrinsic-collapse — the sidebar+grid row wraps on the container's own
//   min-widths, so the sidebar stacks above the grid with no media query;
// - reflow-grid — the tile grid is `repeat(auto-fit, minmax(...))`, so the
//   track list recomputes as the viewport narrows;
// - device-media — the aside slot is `hidden w-full 2xl:block`, visible only
//   past 2xl. A media query is the one mechanism content alone cannot
//   witness, which is why this spec exists at all.
//
// Nothing here pins the wrapped sidebar's width — ecoma-io/loom#275 is open
// on purpose, and the width a wrapped panel keeps is the open question.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=dashboard");
  await expect(page.getByText("Dashboard with sidebar")).toBeVisible();
});

/** The demo's first instance is the sidebar one; the second carries the aside. */
function sidebarRow(page: Page): Locator {
  return page.locator('[style*="flex-wrap:"]').first();
}

/** The demo's second instance: the tile grid of the aside variant. */
function asideVariantGrid(page: Page): Locator {
  return page.locator(".grid").nth(1);
}

/** The demo's second instance: the `2xl:block` aside. */
function metricsAside(page: Page): Locator {
  return page.locator("aside").filter({ hasText: "Visible on 2xl+" });
}

/** The rendered box, or a hard failure: a missing box is a layout defect. */
async function boxOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("expected the panel to be rendered and visible");
  return box;
}

/** The resolved track count of an auto-fit grid. */
async function trackCount(grid: Locator) {
  const template = await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns);
  return template.split(" ").filter(Boolean).length;
}

test("the sidebar stacks above the grid when collapsed and sits beside it when there is room", async ({
  page,
}) => {
  // Locators re-resolve on every use, so one pair of handles reads both bands.
  const sidebar = sidebarRow(page).locator("> aside").first();
  const gridArea = sidebarRow(page).locator("> div").first();

  // Narrow band: the grid area's min-width: 50% cannot be satisfied alongside
  // the sidebar's 16rem basis, so the row wraps.
  await page.setViewportSize({ width: 360, height: 900 });
  const sidebarBox = await boxOf(sidebar);
  const gridBox = await boxOf(gridArea);
  expect(sidebarBox.y + sidebarBox.height).toBeLessThanOrEqual(gridBox.y + 1);

  // Mid band: side by side, sidebar on the left.
  await page.setViewportSize({ width: 800, height: 900 });
  const sidebarWideBox = await boxOf(sidebar);
  const gridAreaWideBox = await boxOf(gridArea);
  expect(gridAreaWideBox.x).toBeGreaterThanOrEqual(sidebarWideBox.x + sidebarWideBox.width - 1);
});

test("the tile grid reflows to fewer columns as the viewport narrows", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 900 });
  const wide = await trackCount(asideVariantGrid(page));
  await page.setViewportSize({ width: 360, height: 900 });
  const narrow = await trackCount(asideVariantGrid(page));
  // The reflow is the contract: a single track is a legal answer at the
  // narrow band (each tile is min(100%, 14rem)), keeping the wide track list
  // down there is not.
  expect(narrow).toBeLessThan(wide);
  expect(narrow).toBeGreaterThanOrEqual(1);
});

test("the aside is a media-query gate: hidden below 2xl, visible past it", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await expect(metricsAside(page)).not.toBeVisible();
  await page.setViewportSize({ width: 800, height: 900 });
  await expect(metricsAside(page)).not.toBeVisible();
  // The ultrawide band, past 2xl (1536px).
  await page.setViewportSize({ width: 2000, height: 900 });
  await expect(metricsAside(page)).toBeVisible();
});
