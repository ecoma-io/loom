import { test, expect } from "@playwright/test";

// Timeline's browser-only keyboard fact is that there is nothing to reach:
// the timeline is a container that owns no interactive surface, so a Tab walk
// must pass straight through it and hand focus out to whatever follows.
// jsdom runs no native Tab-key behaviour, so even that absence is only
// provable against a real browser.

// Timeline's browser-only fact is the spine itself: the connector line
// running through the markers and stopping at the last one. jsdom applies no
// stylesheet, so neither the geometry nor the retirement rule exists there.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=timeline");
  // First hit on a fresh dev server compiles the whole entry chain; the
  // default 5s visibility timeout loses that race on a cold cache.
  await expect(page.getByRole("list").first()).toBeVisible({ timeout: 20_000 });
});

test("the connector runs through the markers and stops after the final entry", async ({ page }) => {
  const items = page.getByRole("list").locator('[role="listitem"]');
  await expect(items).toHaveCount(4);

  // Every stub but the last renders as a real line below its marker; the
  // wrapper retires the final one entirely (display:none — hence no box).
  for (const i of [0, 1, 2]) {
    const line = items.nth(i).locator(".loom-timeline-line");
    await expect(line).toBeVisible();
    const box = await line.boundingBox();
    if (!box) throw new Error(`connector ${String(i)} has no box`);
    expect(box.height).toBeGreaterThan(10);
  }
  await expect(items.nth(3).locator(".loom-timeline-line")).toBeHidden();
});

test("the timeline contributes no keyboard stop — Tab walks straight through it", async ({
  page,
}) => {
  // The container's keyboard-operate duty is passage: a timeline that trapped
  // focus, or added stops a reader never asked for, would be a defect the
  // markup alone cannot show. The demo's only interactive element is the
  // harness sentinel that follows it, so one press of Tab from the page's
  // first focusable element landing on the sentinel proves the four entries
  // in between mounted nothing focusable.
  await page.keyboard.press("Tab");
  await expect(page.locator("#harness-sentinel")).toBeFocused();
  await expect(page.locator('[role="listitem"]')).toHaveCount(4);
});
