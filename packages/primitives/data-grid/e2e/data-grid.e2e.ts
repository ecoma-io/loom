import { test, expect } from "@playwright/test";

// DataGrid's browser-only facts: focus genuinely moves through the cell
// matrix under the arrow keys (jsdom tracks focus, but the roving model is
// the grid's whole point, so it gets real-browser evidence), and the
// selection column reads as one state machine — aria-selected on the row,
// aria-checked="mixed" on the select-all control mid-selection.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=data-grid");
  await expect(page.getByRole("region").first()).toBeVisible();
});

test("the sort control reorders the body rows asc then desc", async ({ page }) => {
  const firstService = async () =>
    (await page.locator("tbody tr").first().locator("td").nth(1).textContent()) ?? "";

  const before = await firstService();
  await page.getByRole("button", { name: /Builds/ }).click();
  await expect(page.getByRole("columnheader", { name: /Builds/ })).toHaveAttribute(
    "aria-sort",
    "ascending",
  );
  const afterAsc = await firstService();
  expect(afterAsc).not.toBe(before); // 7 < 12 < 21, so "web" leads

  await page.getByRole("button", { name: /Builds/ }).click();
  await expect(page.getByRole("columnheader", { name: /Builds/ })).toHaveAttribute(
    "aria-sort",
    "descending",
  );
  expect(await firstService()).toBe("worker"); // 21
});

test("arrow keys move the one Tab stop through the cell matrix", async ({ page }) => {
  const grid = page.getByRole("grid");
  const at = (r: number, c: number) =>
    grid.locator(`[data-r='${String(r)}'][data-c='${String(c)}']`);

  await at(0, 0).focus();
  await expect(at(0, 0)).toBeFocused();

  await page.keyboard.press("ArrowRight");
  await expect(at(0, 1)).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(at(1, 1)).toBeFocused();

  // Exactly one Tab stop, and it followed the moves.
  await expect(grid.locator('[data-r][tabindex="0"]')).toHaveCount(1);
  await expect(at(1, 1)).toHaveAttribute("tabindex", "0");
  await expect(at(0, 0)).toHaveAttribute("tabindex", "-1");
});

test("space selects the focused row and select-all reports mixed mid-selection", async ({
  page,
}) => {
  const grid = page.getByRole("grid");
  const firstRow = page.locator("tbody tr").first();

  await grid.locator(`[data-r='0'][data-c='1']`).focus();
  await page.keyboard.press("Space");
  await expect(firstRow).toHaveAttribute("aria-selected", "true");

  const selectAll = grid.locator(`[data-r='-1'][data-c='0'] [role="checkbox"]`);
  await expect(selectAll).toHaveAttribute("aria-checked", "mixed");

  // Enter activates the focused row.
  await page.keyboard.press("Enter");
  await expect(page.getByText(/Picked:/)).toContainText("api");
});

// The windowed grid shares the demo's checkbox slot and selection state but
// renders a fraction of its rows — a contract only a real browser can prove,
// because the scroll event is what moves the window.
test.describe("virtualized", () => {
  test.beforeEach(async ({ page }) => {
    await page.getByRole("checkbox", { name: /Window 50 rows/ }).click();
    await expect(page.getByRole("grid")).toHaveAttribute("aria-rowcount", "51");
  });

  test("renders a window of the 50 rows, not all of them", async ({ page }) => {
    // 17rem viewport (272px) ≈ 7 visible rows + 8 overscan — nowhere near 51.
    await expect(page.getByRole("grid").locator('[role="row"]')).toHaveCount(1 + 15);
  });

  test("scrolling the region moves the window and re-stamps row indices", async ({ page }) => {
    await page
      .locator('[role="region"]')
      .first()
      .evaluate((el) => {
        el.scrollTop = 440;
      });
    // Row 10 at the top → the window starts at row 2; the first body row
    // carries data-r='2' and restates its position through aria-rowindex.
    const bodyRows = page.getByRole("grid").locator('[role="row"]');
    await expect(page.getByRole("grid").locator('[role="gridcell"]').first()).toHaveAttribute(
      "data-r",
      "2",
    );
    await expect(bodyRows.nth(1)).toHaveAttribute("aria-rowindex", "4");
  });

  test("PageDown pages the roving stop one window at a time", async ({ page }) => {
    const grid = page.getByRole("grid");
    // The 17rem viewport (272px) is six rows tall: PageDown skips a window.
    await grid.locator(`[data-r='0'][data-c='1']`).focus();
    await page.keyboard.press("PageDown");
    await expect(grid.locator(`[data-r='6'][data-c='1']`)).toHaveAttribute("tabindex", "0");
    await expect(grid.locator('[data-r][tabindex="0"]')).toHaveCount(1);
  });

  test("Ctrl+End scrolls the last row into view and focuses it", async ({ page }) => {
    const grid = page.getByRole("grid");
    const lastCell = grid.locator(`[data-r='49'][data-c='3']`);
    await grid.locator(`[data-r='0'][data-c='1']`).focus();
    await page.keyboard.press("Control+End");
    await expect(lastCell).toBeFocused();
    await expect(lastCell).toHaveAttribute("tabindex", "0");
  });
});
