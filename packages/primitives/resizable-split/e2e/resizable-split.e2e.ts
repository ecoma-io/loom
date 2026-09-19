import { test, expect } from "@playwright/test";

// ResizableSplit's browser-only facts: pointer drag really resizes the panel
// and commits on release, and the keyboard contract is real keydowns on a
// focused separator — the aria-valuenow pin in the unit tier says the value
// is reported, this spec says the gestures work in a browser.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=resizable-split");
  await expect(page.getByRole("separator")).toBeVisible();
});

test("arrow keys resize the panel and report every move", async ({ page }) => {
  const separator = page.getByRole("separator");
  await expect(separator).toHaveAttribute("aria-valuenow", "320");
  await expect(separator).toHaveAttribute("aria-valuemin", "160");
  await expect(separator).toHaveAttribute("aria-valuemax", "1080");

  await separator.focus();
  await expect(separator).toBeFocused();

  await page.keyboard.press("ArrowRight");
  await expect(separator).toHaveAttribute("aria-valuenow", "330");
  await page.keyboard.press("ArrowLeft");
  await expect(separator).toHaveAttribute("aria-valuenow", "320");

  await page.keyboard.press("Home");
  await expect(separator).toHaveAttribute("aria-valuenow", "160");
  await page.keyboard.press("End");
  await expect(separator).toHaveAttribute("aria-valuenow", "1080");
});

test("dragging the separator resizes the panel and commits on release", async ({ page }) => {
  const separator = page.getByRole("separator");
  const panel = page.locator("[data-loom-resizable-split] > div").first();
  const startWidth = (await panel.boundingBox())?.width ?? 0;
  const box = await separator.boundingBox();
  if (box === null) throw new Error("separator has no bounding box");
  const sx = box.x + box.width / 2;
  const sy = box.y + box.height / 2;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(sx + 60, sy, { steps: 5 });
  await expect(separator).toHaveAttribute("aria-valuenow", "380");
  await page.mouse.up();

  // Released: the panel box really widened and the committed value held.
  await expect(separator).toHaveAttribute("aria-valuenow", "380");
  const endWidth = (await panel.boundingBox())?.width ?? 0;
  expect(endWidth - startWidth).toBeGreaterThan(50);
});

test("double-click resets the panel to its default width", async ({ page }) => {
  const separator = page.getByRole("separator");
  await separator.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(separator).toHaveAttribute("aria-valuenow", "340");

  await separator.dblclick();
  await expect(separator).toHaveAttribute("aria-valuenow", "320");
});
