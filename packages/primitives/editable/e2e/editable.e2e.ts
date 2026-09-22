import { expect, test, type Locator, type Page } from "@playwright/test";

// The editable's keyboard contract is Loom's own, not the wrapped Reka
// primitive's: Reka has no keyboard path into its preview at all, so Loom
// renders the preview as a real `<button>` and rebuilds activation on top of
// it. What a browser must witness: Enter and Space open the editor from the
// preview in every activation mode, Enter commits and Escape abandons (with
// focus handed back), the `focus` mode opens on arrival without re-opening on
// Escape's own hand-back, and the read-only box seats without ever opening.
//
// The demo mounts eight editables; the ones under spec are found by their
// values, each of which the demo makes unique.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=editable");
  await expect(preview(page, /Q3 operations review/)).toBeVisible({ timeout: 20_000 });
});

/** The preview control of one editable, by its value. */
function preview(page: Page, value: RegExp): Locator {
  return page.getByRole("button", { name: value });
}

/** The open editor of the editable whose preview matches. */
function editor(page: Page, value: RegExp): Locator {
  return page.getByRole("textbox", { name: value });
}

test("Enter opens, Enter commits the typed value, and Escape abandons and hands focus back", async ({
  page,
}) => {
  const title = preview(page, /Q3 operations review/);

  // The title box is the demo's first tab stop.
  await page.keyboard.press("Tab");
  await expect(title).toBeFocused();

  // The preview is a real button: Enter is the browser's activation, and it
  // swaps the value for the editor.
  await page.keyboard.press("Enter");
  const box = editor(page, /a record title/);
  await expect(box).toBeFocused();

  // Enter commits what was typed; the demo prints the event it received.
  await box.press("End");
  await page.keyboard.type(" (moved)");
  await page.keyboard.press("Enter");
  await expect(preview(page, /Q3 operations review \(moved\)/)).toBeVisible();
  await expect(page.getByText("submit: Q3 operations review (moved)")).toBeVisible();

  // The same path abandons: reopening, typing, then Escape restores the
  // committed value and returns focus to the preview.
  await page.keyboard.press("Enter");
  await expect(editor(page, /a record title/)).toBeFocused();
  await page.keyboard.type("junk");
  await page.keyboard.press("Escape");
  await expect(preview(page, /Q3 operations review \(moved\)/)).toBeVisible();
  await expect(page.getByText("junk")).toHaveCount(0);
  await expect(page.getByText("cancel", { exact: true })).toBeVisible();
  await expect(title).toBeFocused();
});

test("focus mode opens on arrival, and Escape's hand-back does not re-open it", async ({
  page,
}) => {
  // Seat the walk before the region box — the click-mode preview does not
  // open on focus, so it is a safe place to Tab from. The owner box in
  // between is dblclick mode and seats silently too.
  await preview(page, /Q3 operations review/).focus();
  await page.keyboard.press("Tab");
  await expect(preview(page, /Mai Phương/)).toBeFocused();
  await page.keyboard.press("Tab");

  // With `activationMode: "focus"` the editor is already open when the caret
  // lands — no Enter needed.
  await expect(page.getByRole("textbox", { name: /focus mode/ })).toBeFocused();

  // Escape abandons the edit and hands focus back to the preview — and the
  // returning focus is suppressed exactly once: the box must not re-open
  // itself, or Escape could never leave it.
  await page.keyboard.press("Escape");
  const region = preview(page, /Northern/);
  await expect(region).toBeFocused();
  await expect(region).toBeVisible();

  // Leaving and coming back deliberately opens it again.
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("textbox", { name: /focus mode/ })).toBeFocused();
});

test("the read-only value seats but never opens, and the disabled box never seats", async ({
  page,
}) => {
  // Read-only keeps a Tab stop — a value on show, reachable and copyable.
  const sku = page.getByText("LM-4471-A");
  await sku.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("textbox", { name: /read-only/ })).toHaveCount(0);
  await expect(sku).toBeVisible();

  // The next stop after the read-only box skips the disabled one entirely and
  // lands on the inline editable in the sentence below it.
  await page.keyboard.press("Tab");
  await expect(page.locator("p").getByRole("button", { name: "Mai Phương" })).toBeFocused();
});
