import { expect, test, type Locator, type Page } from "@playwright/test";

// The tags field's keyboard contract is mostly Loom's own, and deliberately
// not the wrapped Reka primitive's: Reka's virtual chip selection — Backspace
// marks the last token, a second Backspace deletes what was never announced —
// is stopped at the door, and in its place one rule: **Backspace on an empty
// box lifts the last token back into it** as editable text. What a browser
// must witness: Enter and the comma both commit a token, the lift puts a
// token back in the box instead of destroying it, and the remove controls
// work from the keyboard with focus handed back to the box.
//
// The demo's first field is "Keywords", seeded with "design systems" and
// "accessibility". Its tokens are not toggleable, so the only stops inside the
// field are the two remove buttons and the text box itself.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=tags-input");
  await expect(keywordsBox(page)).toBeVisible({ timeout: 20_000 });
});

/** The keywords field's text box — named by its aria-label. */
function keywordsBox(page: Page): Locator {
  return page.getByRole("textbox", { name: "Keywords" });
}

/** One token's remove control, by the label the demo's vocabulary gives it. */
function removeButton(page: Page, value: string): Locator {
  return page.getByRole("button", { name: `Remove ${value}`, exact: true });
}

test("Enter and the comma both commit what was typed", async ({ page }) => {
  await keywordsBox(page).focus();

  // Enter commits the draft as a token.
  await page.keyboard.type("design tokens");
  await page.keyboard.press("Enter");
  await expect(page.getByText("design tokens", { exact: true })).toBeVisible();
  await expect(keywordsBox(page)).toHaveValue("");

  // The delimiter commits without Enter: typing the comma splits at it.
  await page.keyboard.type("vue,");
  await expect(page.getByText("vue", { exact: true })).toBeVisible();
  await expect(keywordsBox(page)).toHaveValue("");
});

test("Backspace on an empty box lifts the last token into it instead of deleting it", async ({
  page,
}) => {
  await keywordsBox(page).focus();

  // The field is seeded with "design systems" and "accessibility": the lift
  // takes the last one out of the row and puts it back in the box as editable
  // text — on screen, with the caret at its end — rather than destroying it.
  await page.keyboard.press("Backspace");
  await expect(keywordsBox(page)).toHaveValue("accessibility");
  await expect(removeButton(page, "accessibility")).toHaveCount(0);

  // Enter puts it straight back: the token re-joins the row.
  await page.keyboard.press("Enter");
  await expect(removeButton(page, "accessibility")).toBeVisible();
  await expect(keywordsBox(page)).toHaveValue("");
});

test("Enter on a remove control removes the token and focus lands back in the box", async ({
  page,
}) => {
  await removeButton(page, "design systems").focus();
  await page.keyboard.press("Enter");

  // The token is gone, and the reader is not dropped to the body: the box is
  // where they were heading anyway.
  await expect(removeButton(page, "design systems")).toHaveCount(0);
  await expect(page.getByText("design systems", { exact: true })).toHaveCount(0);
  await expect(keywordsBox(page)).toBeFocused();
});

test("the walk seats the remove controls and the box, and the count is described", async ({
  page,
}) => {
  // The field's stops: two remove buttons, then the text box.
  await removeButton(page, "design systems").focus();
  await page.keyboard.press("Tab");
  await expect(removeButton(page, "accessibility")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(keywordsBox(page)).toBeFocused();

  // The count travels with the field as a description, not a visible number.
  await expect(keywordsBox(page)).toHaveAccessibleDescription(/2 tags/);
});
