import { expect, test, type Locator, type Page } from "@playwright/test";

// ScrollArea's keyboard contract is the scrollable-region one its sidecar
// names: the viewport is the region a reader must be able to reach and move,
// and the custom scrollbar must never become a stop of its own. Reka renders
// the viewport `tabindex="0"`, so Tab seats it; the browser's own default
// action then scrolls a focused scroll container under the arrow keys; the
// scrollbar is a styled div with no tabindex, so the walk crosses from one
// region to the next without pausing on the chrome. jsdom runs neither the
// tab-order resolution nor the scroll.
//
// The demo mounts three regions in order — vertical, horizontal, both — each
// 12rem tall/wide against far more content than fits, so every scroll below
// has real distance to travel.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=scroll-area");
  await expect(viewport(page, 0)).toBeVisible({ timeout: 20_000 });
});

/** One region's viewport, in demo order: 0 vertical, 1 horizontal, 2 both. */
function viewport(page: Page, index: number): Locator {
  return page.locator("[data-reka-scroll-area-viewport]").nth(index);
}

/** One axis's current scroll offset, read off the live region. */
async function offset(viewport: Locator, axis: "scrollTop" | "scrollLeft"): Promise<number> {
  return viewport.evaluate((el, a) => el[a], axis);
}

test("Tab seats the vertical region and the arrows scroll it; the scrollbar takes no stop", async ({
  page,
}) => {
  // First press of the walk: the region itself is the demo's first stop —
  // scrollable-region-focusable is what makes the content reachable at all,
  // since nothing inside these regions is focusable.
  await page.keyboard.press("Tab");
  await expect(viewport(page, 0)).toBeFocused();

  const before = await offset(viewport(page, 0), "scrollTop");
  await page.keyboard.press("ArrowDown");
  await expect
    .poll(() => offset(viewport(page, 0), "scrollTop"), { timeout: 2_000 })
    .toBeGreaterThan(before);

  // One press leaves the region — the custom scrollbar between the two
  // regions is chrome, not a control, so the walk lands on the next region
  // rather than pausing on the track.
  await page.keyboard.press("Tab");
  await expect(viewport(page, 1)).toBeFocused();
});

test("the horizontal region scrolls on ArrowRight and the walk leaves the demo without a trap", async ({
  page,
}) => {
  await viewport(page, 1).focus();
  await expect(viewport(page, 1)).toBeFocused();

  const before = await offset(viewport(page, 1), "scrollLeft");
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() => offset(viewport(page, 1), "scrollLeft"), { timeout: 2_000 })
    .toBeGreaterThan(before);

  // The third region takes the next stop, and one press after it leaves the
  // demo: no region traps the walk, and no scrollbar between them catches it.
  await page.keyboard.press("Tab");
  await expect(viewport(page, 2)).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator("#harness-sentinel")).toBeFocused();
});
