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

test("Page Down moves by a viewport of rows, Enter activates the active row", async ({ page }) => {
  const list = page.getByRole("list", { name: "Catalogue rows" });

  await page.keyboard.press("Tab");
  await page.keyboard.press("PageDown");

  // h-96 = 384px viewport → 12 rows per page; focus lands 12 rows in.
  const jumped = list.getByRole("listitem").nth(12);
  await expect(jumped).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(page.getByText(/Activated: Row 12/)).toBeVisible();
  // The demo marks the picked row inside the row's slot content.
  await expect(jumped.locator('[data-picked="true"]')).toBeVisible();
});
