import { expect, test, type Locator, type Page } from "@playwright/test";

// MasterDetail is the geometry and nothing else: two panes around slotted
// content it does not operate, so its keyboard-operate duty is passage — the
// panes must add no tab stop of their own and must not trap the walk, in
// either geometry the intrinsic collapse produces. The demo's slotted content
// is deliberately inert prose, which is what makes the container's own
// contribution measurable: a shell that invented a stop, or that swallowed
// Tab, would show against content that has no stops of its own.
//
// The detail pane is a scroll container (`overflow-y-auto`) — the #438 class
// of element that some engines seat in the tab order on their own. The walk
// here is the check that it takes no stop at the widths the demo is read at.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=master-detail");
  await expect(page.getByText("Master list").nth(0)).toBeVisible({ timeout: 20_000 });
});

/** The detail panes — the two scroll-capable panes the layout renders. */
function detailPanes(page: Page): Locator {
  return page.locator(".overflow-y-auto");
}

test("side by side, the walk crosses both panes to the sentinel without gaining a stop", async ({
  page,
}) => {
  await expect(detailPanes(page)).toHaveCount(2);

  // One press: past the master pane, past the detail pane, out of the demo.
  // The sentinel is the harness's own trailing stop, so reaching it on the
  // first press is the proof that neither pane invented one.
  await page.keyboard.press("Tab");
  await expect(page.locator("#harness-sentinel")).toBeFocused();

  // And the scroll-capable pane never seats itself: no pane renders the
  // explicit tabindex that would put it in the walk.
  for (const pane of await detailPanes(page).all()) {
    await expect(pane).not.toHaveAttribute("tabindex");
  }
});

test("wrapped, the panes stack and the passage is the same one press", async ({ page }) => {
  // Below the collapse width the pair stacks — master above detail — and the
  // keyboard duty must not change with the geometry. The stack is asserted
  // by order, not assumed, so "wrapped" names a real arrangement here.
  await page.setViewportSize({ width: 360, height: 900 });
  const master = await page.getByText("Master list").nth(0).boundingBox();
  const detail = await page.getByText("Detail content").nth(0).boundingBox();
  expect(master && detail && master.y < detail.y).toBe(true);

  await page.keyboard.press("Tab");
  await expect(page.locator("#harness-sentinel")).toBeFocused();
});
