import { expect, test, type Locator, type Page } from "@playwright/test";

// AppHeader's browser-only facts are the two rows of its own docblock:
// below `sm` the search drops to a full-width second row (the wrap threshold
// — hiding it would decide the host's users need it less on a phone), and
// past `sm` the strip snaps back to one fixed-height row whose height steps
// again at `3xl`. jsdom can pin the classes; only a real layout can say which
// line the search actually lands on and how tall the strip resolved.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=app-header");
  await expect(page.getByText("Acme", { exact: true })).toBeVisible();
});

/** The strip itself — a `banner` landmark named by the demo. */
function bar(page: Page): Locator {
  return page.getByRole("banner", { name: "Primary navigation" });
}

/** The search field: the region that changes lines at the threshold. */
function search(page: Page): Locator {
  return page.getByRole("searchbox", { name: "Search" });
}

/** The rendered box, or a hard failure. */
async function boxOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("expected the header region to be rendered and visible");
  return box;
}

test("below sm the search takes its own row above nothing; past sm it rejoins the brand", async ({
  page,
}) => {
  const brand = page.getByText("Acme", { exact: true });

  // Narrow band: `basis-full` + `order-last` — the search is a second row,
  // below the brand line.
  await page.setViewportSize({ width: 360, height: 900 });
  const brandBox = await boxOf(brand);
  const searchBox = await boxOf(search(page));
  expect(searchBox.y).toBeGreaterThanOrEqual(brandBox.y + brandBox.height - 1);
  // The strip grew past its single-row height to hold both lines.
  const barBox = await boxOf(bar(page));
  expect(barBox.height).toBeGreaterThan(56);

  // Mid band: past `sm` the strip is `flex-nowrap` — brand and search share
  // the one line.
  await page.setViewportSize({ width: 800, height: 900 });
  const brandWideBox = await boxOf(brand);
  const searchWideBox = await boxOf(search(page));
  expect(Math.abs(searchWideBox.y - brandWideBox.y)).toBeLessThanOrEqual(2);
  const barWideBox = await boxOf(bar(page));
  expect(Math.abs(barWideBox.height - 56)).toBeLessThanOrEqual(1);
});

test("past 3xl the strip's height steps up to h-16", async ({ page }) => {
  await page.setViewportSize({ width: 2000, height: 900 });
  const barBox = await boxOf(bar(page));
  expect(Math.abs(barBox.height - 64)).toBeLessThanOrEqual(1);
});
