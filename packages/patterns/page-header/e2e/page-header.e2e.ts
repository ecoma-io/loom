import { expect, test, type Locator } from "@playwright/test";

// PageHeader's browser-only facts are the three width behaviours of its own
// docblock: the actions wrap under the title once the title block cannot
// hold its `basis-56` (the wrap threshold — basis, not a width), the
// description is capped at `max-w-prose` so a one-line orientation never
// stretches across an ultrawide canvas (the bound), and the gutters step
// `px-4 sm:px-6 3xl:px-8` on the shared scale (band-scale). jsdom can pin
// the classes; only a real layout can say which line the actions land on,
// whether the cap actually binds, and what a gutter resolved to.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=page-header");
  await expect(page.getByRole("heading", { name: "Workflows" })).toBeVisible();
});

/** The rendered box, or a hard failure. */
async function boxOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("expected the header region to be rendered and visible");
  return box;
}

test("the actions drop under the title at the narrow band and share its line past it", async ({
  page,
}) => {
  const title = page.getByRole("heading", { name: "Workflows" });
  const filter = page.getByRole("button", { name: "Filter" });

  // Narrow band: the title block cannot hold its ~14rem basis alongside the
  // actions, so the actions take their own row beneath it.
  await page.setViewportSize({ width: 360, height: 900 });
  const titleBox = await boxOf(title);
  const filterBox = await boxOf(filter);
  expect(filterBox.y).toBeGreaterThanOrEqual(titleBox.y + titleBox.height - 1);

  // Mid band: one flex line — actions trail the title on the same row.
  await page.setViewportSize({ width: 800, height: 900 });
  const titleWideBox = await boxOf(title);
  const filterWideBox = await boxOf(filter);
  expect(Math.abs(filterWideBox.y - titleWideBox.y)).toBeLessThanOrEqual(2);
});

test("the description holds reading measure while the band grows around it", async ({ page }) => {
  const description = page.getByText("Workflows you built");
  const measure = await boxOf(description);

  // At the ultrawide band the title block has filled out to the viewport,
  // but the description inside it stays at its prose cap — the width that
  // opens up belongs to the actions and the work below.
  await page.setViewportSize({ width: 2000, height: 900 });
  const wideBlock = await boxOf(description.locator(".."));
  const wideMeasure = await boxOf(description);
  expect(wideBlock.width).toBeGreaterThan(1000);
  expect(wideMeasure.width).toBeLessThan(700);
  expect(wideMeasure.width).toBeLessThanOrEqual(measure.width + 1);
});

test("the gutters step on the shared scale at the canonical bands", async ({ page }) => {
  // PageHeader pads on the same px-4 / sm:px-6 / 3xl:px-8 scale the root
  // sweep walks the layouts on — witnessed here on the pattern's own demo,
  // which the sweep never loads (it walks layouts, not patterns).
  const bar = page.locator("#app header").first();
  const bands = [
    { width: 360, padding: 16 },
    { width: 800, padding: 24 },
    { width: 2000, padding: 32 },
  ] as const;
  for (const band of bands) {
    await page.setViewportSize({ width: band.width, height: 900 });
    const padding = await bar.evaluate((el) => Number.parseFloat(getComputedStyle(el).paddingLeft));
    expect(
      padding,
      `PageHeader must pad ${String(band.padding)}px at a ${String(band.width)}px viewport`,
    ).toBe(band.padding);
  }
});

test("Tab reaches the actions the header hosts, in DOM order, and leaves the band", async ({
  page,
}) => {
  // The band is a container: it operates nothing itself, so its
  // keyboard-operate duty is passage through the title region — focus must
  // walk the actions slot's buttons in DOM order and leave the band without
  // a trap, past the wrap threshold where the actions sit under the title
  // (a wrapped row is still one DOM sequence the keyboard follows). Seated
  // by script at the walk's first stop because the gesture under test is the
  // Tab chain; asserted per stop by identity.
  await page.setViewportSize({ width: 800, height: 900 });

  const filter = page.getByRole("button", { name: "Filter", exact: true });
  await filter.focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Create workflow", exact: true })).toBeFocused();
  // The surfaces below the band host no controls, so the next stop is out of
  // the band entirely — the harness's trailing tab stop follows the demo,
  // and reaching it proves the title region released focus.
  await page.keyboard.press("Tab");
  await expect(page.locator("#harness-sentinel")).toBeFocused();
});
