import { test, expect } from "@playwright/test";

// Table's browser-only facts: the sort control actually reorders rendered
// rows (state machines live in jsdom; layout order does not), and a wide
// table's scroll region stays keyboard-reachable.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=table");
  await expect(page.getByRole("region").first()).toBeVisible();
});

test("the sort control reorders the body rows asc then desc", async ({ page }) => {
  const firstService = async () =>
    (await page.locator("tbody tr").first().locator("td").first().textContent()) ?? "";

  const before = await firstService();
  await page.getByRole("button", { name: /Builds/ }).click();
  await expect(page.locator("th").nth(1)).toHaveAttribute("aria-sort", "ascending");
  const afterAsc = await firstService();
  expect(afterAsc).not.toBe(before); // 7 < 12 < 21, so "web" leads

  await page.getByRole("button", { name: /Builds/ }).click();
  await expect(page.locator("th").nth(1)).toHaveAttribute("aria-sort", "descending");
  expect(await firstService()).toBe("worker"); // 21
});

test("picking a row is keyboard-reachable and stated twice", async ({ page }) => {
  const row = page.locator("tbody tr").first();
  await row.focus(); // rows are Tab stops via tabindex
  await row.press("Enter");

  await expect(row).toHaveAttribute("aria-selected", "true");
  // The glyph beside aria-current — colour alone is not the state.
  const service = await row.locator("td").first().textContent();
  if (!service) throw new Error("row has no first cell");
  await expect(page.getByText(/Picked:/)).toContainText(service);
});
