import { expect, test, type Locator, type Page } from "@playwright/test";

// SplitLayout renders no resizer — that act is resizable-split's — so its
// keyboard-operate duty, as the corrected sidecar states it, is Tab passage
// across the two panes' slotted content, wide and wrapped. The layout
// operates nothing; what a browser alone can witness is that the shell adds
// no stop of its own and traps nothing, in both geometries the intrinsic
// collapse produces, with the header slot in place above the split row.
//
// The demo mounts two instances — side left, side right — whose slotted
// content is inert prose, which is what makes the container's own
// contribution measurable against content that has no stops of its own.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=split-layout");
  await expect(page.getByText("Header bar").nth(0)).toBeVisible({ timeout: 20_000 });
});

/** The content panes — the scroll-capable panes the two instances render. */
function contentPanes(page: Page): Locator {
  return page.locator(".overflow-y-auto");
}

test("wide, the walk crosses header, both panes and both instances in one press", async ({
  page,
}) => {
  await expect(contentPanes(page)).toHaveCount(2);

  // One press from the top of the page: past the left instance's header and
  // side/content panes, past the right instance's content/side panes, out of
  // the demo. The sentinel is the harness's own trailing stop; reaching it
  // on the first press is the proof that nothing in the shells invented a
  // stop or caught the walk.
  await page.keyboard.press("Tab");
  await expect(page.locator("#harness-sentinel")).toBeFocused();

  // The scroll-capable content pane never seats itself — no explicit
  // tabindex for an engine to disagree with.
  for (const pane of await contentPanes(page).all()) {
    await expect(pane).not.toHaveAttribute("tabindex");
  }
});

test("wrapped, both instances stack and the passage is still one press", async ({ page }) => {
  // Below the collapse width the panels wrap: side above content when
  // side="left", content above side when side="right". The stacks are
  // asserted by order, not assumed, so "wrapped" names a real arrangement.
  await page.setViewportSize({ width: 360, height: 900 });
  const leftSide = await page.getByText("Side panel").nth(0).boundingBox();
  const leftContent = await page.getByText("Content area").nth(0).boundingBox();
  const rightSide = await page.getByText("Right panel").nth(0).boundingBox();
  const rightContent = await page.getByText("Content area").nth(1).boundingBox();
  expect(leftSide && leftContent && leftSide.y < leftContent.y).toBe(true);
  expect(rightSide && rightContent && rightContent.y < rightSide.y).toBe(true);

  await page.keyboard.press("Tab");
  await expect(page.locator("#harness-sentinel")).toBeFocused();
});
