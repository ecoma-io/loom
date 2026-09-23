import { expect, test, type Locator, type Page } from "@playwright/test";

// The number field's keyboard contract: the spinbutton input is a Tab stop the
// arrows step (Reka's handling), Shift multiplies one tick by ten (Loom's own
// capture handler, which Reka has no equivalent of), Home and End jump to the
// clamped bounds, Enter commits once per gesture — and the stepper buttons are
// real buttons that Reka deliberately holds OFF the tab order (`tabindex="-1"`),
// working from direct focus or pointer but never from the walk. jsdom runs none
// of the key handling, which is why the unit tier could only assert the markup
// and the emitted values.
//
// The demo's instances are found by the labelled heading each one carries —
// the id lands on the spinbutton itself — and the committed line at the page's
// foot prints one entry per gesture, newest first.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=number-field");
  await expect(spinbutton(page, "number-field-demo-x")).toBeVisible({ timeout: 20_000 });
});

/** The spinbutton of one demo instance, by the labelled heading it carries. */
function spinbutton(page: Page, labelledBy: string): Locator {
  return page.locator(`[role="spinbutton"][aria-labelledby="${labelledBy}"]`);
}

/** One of the x field's stepper buttons, by its label. */
function stepper(page: Page, direction: "Increase value" | "Decrease value"): Locator {
  return spinbutton(page, "number-field-demo-x")
    .locator("..")
    .getByRole("button", { name: direction });
}

/** The demo's committed-value entries for one field. */
function committedEntries(page: Page): Locator {
  return page.locator("span.tabular").filter({ hasText: "x →" });
}

test("the arrows step the value, Enter commits once, and typing replaces", async ({ page }) => {
  const x = spinbutton(page, "number-field-demo-x");

  // The x field is the demo's first tab stop.
  await page.keyboard.press("Tab");
  await expect(x).toBeFocused();
  await expect(x).toHaveValue("120");

  // One press is one tick — keydown steps, keyup ends the gesture and
  // commits it — so the readout moves and the demo prints the checkpoint.
  await page.keyboard.press("ArrowUp");
  await expect(x).toHaveValue("121");
  await expect(committedEntries(page)).toHaveCount(1);
  await expect(committedEntries(page)).toHaveText("x → 121");

  // Typing is the other path in: replace the value and commit it the same way.
  await x.press("ControlOrMeta+a");
  await page.keyboard.type("55");
  await page.keyboard.press("Enter");
  await expect(committedEntries(page)).toHaveCount(2);
  await expect(committedEntries(page).first()).toHaveText("x → 55");
});

test("Shift multiplies the tick by ten, and Home and End jump to the clamped bounds", async ({
  page,
}) => {
  const rotation = spinbutton(page, "number-field-demo-rotation");

  await rotation.focus();
  await expect(rotation).toHaveValue("45");

  // Loom's own capture handler: one Shift+ArrowUp is ten degrees.
  await page.keyboard.press("Shift+ArrowUp");
  await expect(rotation).toHaveValue("55");

  // The rotation field is clamped to -180…180: End lands exactly on the max
  // and an arrow past it stays there.
  await page.keyboard.press("End");
  await expect(rotation).toHaveValue("180");
  await page.keyboard.press("ArrowUp");
  await expect(rotation).toHaveValue("180");

  // Home is the other pole, and the shift tick clamps against it too.
  await page.keyboard.press("Home");
  await expect(rotation).toHaveValue("-180");
  await page.keyboard.press("Shift+ArrowDown");
  await expect(rotation).toHaveValue("-180");
});

test("the steppers stay off the tab order and answer the pointer, not the keyboard", async ({
  page,
}) => {
  const x = spinbutton(page, "number-field-demo-x");

  await x.focus();
  // The steppers are held off the walk — the input is the field's only stop,
  // so a Tab from it lands on the next field's input.
  await page.keyboard.press("Tab");
  await expect(spinbutton(page, "number-field-demo-rotation")).toBeFocused();
  await expect(stepper(page, "Increase value")).toHaveAttribute("tabindex", "-1");

  // Held off the walk is the smaller half of it: focused directly, Enter is
  // the browser's own button activation and the value does not move — reka's
  // pressed-hold handler listens to pointerdown only, so the click a key
  // synthesizes has nothing to land on. This is the defect behind the
  // keyboard-operate row this component still carries (see a11y.json).
  await stepper(page, "Increase value").focus();
  await page.keyboard.press("Enter");
  await expect(x).toHaveValue("120");

  // The same button is alive to the pointer: one press is one tick.
  await stepper(page, "Increase value").click();
  await expect(x).toHaveValue("121");
});

test("the disabled field is no tab stop at all", async ({ page }) => {
  const opacity = spinbutton(page, "number-field-demo-opacity");
  const locked = spinbutton(page, "number-field-demo-locked");
  const rate = spinbutton(page, "number-field-demo-readonly");

  // The locked field between opacity and rate is disabled: its input takes no
  // walk at all, and its steppers were never on it — so one Tab spans both.
  await expect(locked).toBeDisabled();
  await opacity.focus();
  await page.keyboard.press("Tab");
  await expect(rate).toBeFocused();
});
