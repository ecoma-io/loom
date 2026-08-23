import { test, expect } from "@playwright/test";

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
