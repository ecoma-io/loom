import { test, expect } from "@playwright/test";

// VirtualList's browser-only facts: roving focus across a list too long to
// paint, windowed DOM that stays small while the logical list is huge, and
// keyboard activation — the interaction contract of the a11y.json sidecar.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=virtual-list");
  await expect(page.getByRole("list", { name: "Catalogue rows" })).toBeVisible();
});

test("focus enters on the first row and roves with the arrow keys", async ({ page }) => {
  const list = page.getByRole("list", { name: "Catalogue rows" });

  // The list is one Tab stop: Tab lands on the first (and only tabbable) row.
  await page.keyboard.press("Tab");
  await expect(list.getByRole("listitem").nth(0)).toBeFocused();

  await page.keyboard.press("ArrowDown");
  await expect(list.getByRole("listitem").nth(1)).toBeFocused();

  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(list.getByRole("listitem").nth(3)).toBeFocused();

  await page.keyboard.press("ArrowUp");
  await expect(list.getByRole("listitem").nth(2)).toBeFocused();
});

test("Tab steps past the whole list to the next control, and Shift+Tab returns", async ({
  page,
}) => {
  const list = page.getByRole("list", { name: "Catalogue rows" });

  await page.keyboard.press("Tab");
  await expect(list.getByRole("listitem").nth(0)).toBeFocused();

  // One stop for the whole list: the next Tab leaves it for the control that
  // follows the demo (the harness's end-of-demo sentinel), not the next
  // painted row — and Shift+Tab walks back into the same row.
  await page.keyboard.press("Tab");
  await expect(page.locator("#harness-sentinel")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(list.getByRole("listitem").nth(0)).toBeFocused();
});

test("Home and End jump across the full logical list — not just painted rows", async ({ page }) => {
  const list = page.getByRole("list", { name: "Catalogue rows" });
  const last = list.getByRole("listitem").last();

  await page.keyboard.press("Tab");
  await page.keyboard.press("End");

  // The last of 50_000 rows is focused and reports its place in the full set.
  await expect(last).toBeFocused();
  await expect(last).toHaveAttribute("aria-setsize", "50000");
  await expect(last).toHaveAttribute("aria-posinset", "50000");

  // The DOM stayed windowed the whole way: nowhere near 50_000 nodes.
  expect(await list.getByRole("listitem").count()).toBeLessThan(100);

  await page.keyboard.press("Home");
  await expect(list.getByRole("listitem").first()).toBeFocused();
});

test("the Tab stop survives the active row scrolling out of the window", async ({ page }) => {
  const list = page.getByRole("list", { name: "Catalogue rows" });

  await page.keyboard.press("Tab");
  await page.keyboard.press("End");
  await expect(list.getByRole("listitem").last()).toBeFocused();

  // Drag the scroll position back to the top without moving the active row:
  // the maintained position (49999) is no longer painted — if the stop had
  // pointed at it, the list would have nothing tabbable left.
  await list.evaluate((el) => {
    el.scrollTop = 0;
    el.dispatchEvent(new Event("scroll"));
  });

  // Focus fell off the detached row; the next Tab lands on the visible row
  // nearest the stale active position — the bottom of the first window —
  // and adopts it as the roving position.
  await page.keyboard.press("Tab");
  const stop = list.locator('[role="listitem"][tabindex="0"]');
  await expect(stop).toHaveCount(1);
  await expect(stop).toBeFocused();
  const place = await stop.getAttribute("aria-posinset");
  expect(Number(place)).toBeGreaterThan(1);
  expect(Number(place)).toBeLessThan(100);

  // Roving continues from the adopted row, not from the stale 49999: one
  // ArrowDown moves focus exactly one row past it.
  await page.keyboard.press("ArrowDown");
  await expect(list.locator(":focus")).toHaveAttribute("aria-posinset", String(Number(place) + 1));
});

test("Page Down and Page Up move by a viewport of rows, Enter activates the active row", async ({
  page,
}) => {
  const list = page.getByRole("list", { name: "Catalogue rows" });

  await page.keyboard.press("Tab");
  await page.keyboard.press("PageDown");

  // h-96 = 384px viewport → 12 fully visible rows per page; focus lands 12 rows in.
  const jumped = list.getByRole("listitem").nth(12);
  await expect(jumped).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(page.getByText(/Activated: Row 12/)).toBeVisible();
  // The demo marks the picked row inside the row's slot content.
  await expect(jumped.locator('[data-picked="true"]')).toBeVisible();

  // Page Up walks back the same page of rows — from row 12, to the very top.
  await page.keyboard.press("PageUp");
  await expect(list.getByRole("listitem").nth(0)).toBeFocused();
});
