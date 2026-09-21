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

test("the row's gap steps with the sm band", async ({ page }) => {
  // The row carries `gap-3 sm:gap-4` while the gap prop is on (the demo's
  // first instance turns it on): 12px below `sm`, 16px at or above it.
  await page.setViewportSize({ width: 360, height: 900 });
  const narrowGap = await row(page).evaluate((el) =>
    Number.parseFloat(getComputedStyle(el).columnGap),
  );
  expect(narrowGap).toBe(12);

  await page.setViewportSize({ width: 800, height: 900 });
  const midGap = await row(page).evaluate((el) =>
    Number.parseFloat(getComputedStyle(el).columnGap),
  );
  expect(midGap).toBe(16);
});

test("Tab reaches every link the row hosts in document order, wrapped or side by side", async ({
  page,
}) => {
  // Sidebar operates nothing itself — its collapse is intrinsic CSS, with no
  // control to press — so the container's keyboard-operate duty is passage:
  // focus must walk the hosted links in DOM order (side first for
  // side="left"), cross the pane boundary, and leave the layout without a
  // trap. jsdom can enumerate the anchors but never prove a real Tab chain
  // moves focus; the walk is seated by script at its first stop because the
  // gesture under test is the Tab chain itself, and every stop is asserted by
  // identity so a skip or a trap fails at the stop it happens.
  const overview = page.getByRole("link", { name: "Overview", exact: true });
  const projects = page.getByRole("link", { name: "Projects", exact: true });
  const notes = page.getByRole("link", { name: "Release notes", exact: true });

  await page.setViewportSize({ width: 800, height: 900 });
  await overview.focus();
  await page.keyboard.press("Tab");
  await expect(projects).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(notes).toBeFocused();
  // Out of the layout entirely: the harness's trailing tab stop follows the
  // demo, so reaching it proves the row released focus rather than looping.
  await page.keyboard.press("Tab");
  await expect(page.locator("#harness-sentinel")).toBeFocused();

  // The same walk once the row has wrapped: stacking changes the geometry a
  // reader sees, never the DOM order the keyboard follows — the collapse is
  // keyboard-neutral because it owns no focus of its own to move.
  await page.setViewportSize({ width: 360, height: 900 });
  await overview.focus();
  await page.keyboard.press("Tab");
  await expect(projects).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(notes).toBeFocused();
});
