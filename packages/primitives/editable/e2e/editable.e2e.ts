import { expect, test, type Locator, type Page } from "@playwright/test";

// The editable's keyboard contract is Loom's own, not the wrapped Reka
// primitive's: Reka has no keyboard path into its preview at all, so Loom
// renders the preview as a real `<button>` and rebuilds activation on top of
// it. What a browser must witness: Enter opens the editor from the preview,
// Escape abandons with focus handed back, the `focus` mode opens on arrival
// without re-opening on Escape's own hand-back, and the read-only box seats
// without ever opening. The commit half — Enter committing the typed value and
// returning to the preview — is witnessed broken in the browser: the submit
// event fires and the value lands, but the editor never closes (see the
// register row this component still carries).
//
// The demo mounts nine editables; two of them show the same owner, so
// previews are matched by value AND taken in document order.

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

test("Enter opens the editor, and Escape abandons and hands focus back", async ({ page }) => {
  const title = preview(page, /Q3 operations review/);

  // The title box is the demo's first tab stop.
  await page.keyboard.press("Tab");
  await expect(title).toBeFocused();

  // The preview is a real button: Enter is the browser's activation, and it
  // swaps the value for the editor.
  await page.keyboard.press("Enter");
  const box = editor(page, /a record title/);
  await expect(box).toBeFocused();

  // Escape abandons: the typed text is thrown away, the demo prints the cancel
  // event, and focus lands back on the preview.
  await box.press("End");
  await page.keyboard.type(" (moved)");
  await page.keyboard.press("Escape");
  await expect(preview(page, /Q3 operations review/)).toBeVisible();
  await expect(page.getByText(/Q3 operations review \(moved\)/)).toHaveCount(0);
  await expect(page.getByText("cancel", { exact: true })).toBeVisible();
  await expect(title).toBeFocused();

  // The commit half is not witnessed here, and deliberately so: in the browser
  // the Enter-commit fires the submit event and the value lands, but the
  // editor stays open instead of returning to its preview — the defect behind
  // the keyboard-operate row this component still carries in the interaction
  // register. The unit tier cannot see it: jsdom's trigger("keydown") runs the
  // key handler but never the focus swap the commit is supposed to perform.
});

test("focus mode opens on arrival, and Escape's hand-back does not re-open it", async ({
  page,
}) => {
  // Seat the walk before the region box — the click-mode preview does not
  // open on focus, so it is a safe place to Tab from. The owner box in
  // between is dblclick mode and seats silently too. Both owner previews
  // carry the same name, so the walk aims at the first in document order.
  await preview(page, /Q3 operations review/).focus();
  await page.keyboard.press("Tab");
  await expect(preview(page, /Mai Phương/).first()).toBeFocused();
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
  // The stop is the preview wrapper's own `tabindex="0"`; the value text sits
  // in a span inside it, so the seat targets the wrapper, not the text.
  const sku = page.locator('[aria-labelledby="editable-demo-sku"] [tabindex="0"]');
  await sku.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("textbox", { name: /read-only/ })).toHaveCount(0);
  await expect(sku).toBeVisible();

  // The next stop after the read-only box should skip the disabled one
  // entirely and land on the inline editable in the sentence below it. The
  // landing is instrumented rather than assumed: where the walk actually went
  // is what the message reports if this assertion fails.
  await page.keyboard.press("Tab");
  const landed = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return "body";
    const role = el.getAttribute("role");
    const text = el.textContent.trim().slice(0, 40);
    return `${el.tagName.toLowerCase()}${role ? `[role=${role}]` : ""}: ${text}`;
  });
  await expect(
    page.locator("p").getByRole("button", { name: "Mai Phương" }),
    `the Tab out of the read-only value landed on: ${landed}`,
  ).toBeFocused();
});
