import { expect, test, type Locator } from "@playwright/test";

// PageHeader's browser-only facts are the two width behaviours of its own
// docblock: the actions wrap under the title once the title block cannot
// hold its `basis-56` (the wrap threshold — basis, not a width), and the
// description is capped at `max-w-prose` so a one-line orientation never
// stretches across an ultrawide canvas (the bound). jsdom can pin the
// classes; only a real layout can say which line the actions land on and
// whether the cap actually binds.

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

  // The band-scale half of the claim — the stepped gutters — is witnessed by
  // the root sweep, which walks every layout at the canonical bands.
});
