import { expect, test, type Locator, type Page } from "@playwright/test";

// The otp row's keyboard contract is the wrapped Reka PinInput's runtime
// behaviour: a roving tabindex makes the row one Tab stop seated on the first
// empty cell, a typed digit fills its cell and carries focus to the next one,
// the last cell's digit completes the code once, Backspace on an empty cell
// steps back and clears the cell before it, and the arrows walk the row. jsdom
// runs none of the focus movement, which is why the unit tier could only
// assert the markup and the emitted values.
//
// The demo's first row ("otp-demo-code") is the six-digit code with the
// entered/confirmed readout under it.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=otp-input");
  await expect(cell(page, 1)).toBeVisible({ timeout: 20_000 });
});

/** One demo row, scoped by the labelled span only it carries — the code and invalid rows are both six cells with the same per-cell names, so the row is the scope, never the name. */
function row(page: Page, labelledBy: string): Locator {
  return page.locator(`[aria-labelledby="${labelledBy}"]`);
}

/** One cell of the demo's first row — each names itself by position. */
function cell(page: Page, position: number): Locator {
  return row(page, "otp-demo-code").getByRole("textbox", {
    name: `Digit ${String(position)} of 6`,
  });
}

test("Tab seats the first empty cell, typing fills and advances, and the last digit completes the code", async ({
  page,
}) => {
  // The row is one stop, and the stop is where the next character goes.
  await page.keyboard.press("Tab");
  await expect(cell(page, 1)).toBeFocused();

  // Each digit lands in its own cell and hands focus to the next.
  await page.keyboard.type("12");
  await expect(cell(page, 1)).toHaveValue("1");
  await expect(cell(page, 3)).toBeFocused();

  // The rest of the code: the sixth digit fires `complete` once, and the
  // demo's confirmed line repeats exactly what was entered.
  await page.keyboard.type("3456");
  await expect(cell(page, 6)).toHaveValue("6");
  await expect(page.getByText("Entered:")).toContainText("123456");
  await expect(page.getByText("confirmed:")).toContainText("123456");

  // With the row full, the single stop is the last cell: the next Tab leaves
  // the row entirely and seats the masked PIN's first cell.
  await page.keyboard.press("Tab");
  await expect(
    row(page, "otp-demo-pin").getByRole("textbox", { name: "Digit 1 of 4" }),
  ).toBeFocused();
});

test("Backspace on an empty cell steps back and clears the one before it, and the arrows walk", async ({
  page,
}) => {
  await page.keyboard.press("Tab");
  await page.keyboard.type("12");
  await expect(cell(page, 3)).toBeFocused();

  // Backspace on the empty third cell: focus steps back to the second and
  // clears what it holds, leaving the first digit standing.
  await page.keyboard.press("Backspace");
  await expect(cell(page, 2)).toBeFocused();
  await expect(cell(page, 2)).toHaveValue("");
  await expect(cell(page, 1)).toHaveValue("1");
  await expect(page.getByText("Entered:")).toContainText("1");

  // The arrows move focus without clearing anything.
  await page.keyboard.press("ArrowLeft");
  await expect(cell(page, 1)).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(cell(page, 2)).toBeFocused();
});
