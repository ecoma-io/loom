import { expect, test, type Locator, type Page } from "@playwright/test";

// Inline's browser-only facts are the two halves of its line contract: the
// gap scale steps a notch below Tailwind's `sm`, and the `wrap` prop decides
// whether an over-full row breaks onto new lines or stays one line and
// overflows. The wrap:true side is what the layout engine cannot model (the
// adapter throws on it, loudly), which is exactly why a browser spec — not a
// conformance case — is the place this behaviour is witnessed.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=inline");
  await expect(page.getByText("Gap steps")).toBeVisible();
});

/** The demo's first Inline (`gap="sm"`): an `flex-row` whose items read
 *  "sm", "gap", "items" — the second instance's row also carries "gap", so
 *  DOM order picks the first. */
function smallGapRow(page: Page): Locator {
  return page
    .locator("div.flex-row")
    .filter({ has: page.getByText("gap", { exact: true }) })
    .first();
}

test("the gap scale steps down below the sm band", async ({ page }) => {
  const row = smallGapRow(page);
  await page.setViewportSize({ width: 800, height: 900 });
  const above = await row.evaluate((el) => Number.parseFloat(getComputedStyle(el).columnGap));
  await page.setViewportSize({ width: 360, height: 900 });
  const below = await row.evaluate((el) => Number.parseFloat(getComputedStyle(el).columnGap));
  // gap="sm": gap-2 sm:gap-3 — 12px above `sm`, 8px below.
  expect(above).toBe(12);
  expect(below).toBe(8);
});

test("wrap breaks an over-full row onto new lines; nowrap keeps one and overflows", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 900 });

  // The wrapping instance is capped at max-w-48 (192px), so its eight items
  // cannot fit one line at any band — rows are the contract.
  const wrapping = page.locator(".max-w-48");
  await expect(wrapping).toBeVisible();
  const wrappedRows = await wrapping.evaluate(
    (el) =>
      new Set([...el.children].map((child) => Math.round(child.getBoundingClientRect().y))).size,
  );
  expect(
    wrappedRows,
    "an over-full wrapping Inline must break onto more than one line",
  ).toBeGreaterThan(1);

  // The no-wrap instance stays a single line; the overflow goes into its own
  // scroll container instead of stretching the page.
  const nowrap = page.locator(".flex-nowrap");
  await expect(nowrap).toBeVisible();
  const { rows, overflows } = await nowrap.evaluate((el) => ({
    rows: new Set([...el.children].map((child) => Math.round(child.getBoundingClientRect().y)))
      .size,
    overflows: el.scrollWidth > el.clientWidth,
  }));
  expect(rows, "a nowrap Inline must keep every item on one line").toBe(1);
  expect(overflows, "the one-line row must overflow its scroll container").toBe(true);
});
