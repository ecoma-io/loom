import { expect, test, type Locator, type Page } from "@playwright/test";

// The number field's keyboard contract: the spinbutton input is a Tab stop the
// arrows step (Reka's handling), Shift multiplies one tick by ten (Loom's own
// capture handler, which Reka has no equivalent of), Home and End jump to the
// clamped bounds, Enter commits once per gesture, and the stepper buttons are
// native buttons on the tab order. jsdom runs none of the key handling, which
// is why the unit tier could only assert the markup and the emitted values.
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

test("the stepper buttons are on the tab order and Enter works them", async ({ page }) => {
  const x = spinbutton(page, "number-field-demo-x");

  await x.focus();
  // From the input, the next stops are the increment then the decrement button.
  await page.keyboard.press("Tab");
  await expect(stepper(page, "Increase value")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(stepper(page, "Decrease value")).toBeFocused();

  // Native button activation: Enter presses the stepper and the readout moves.
  await page.keyboard.press("Enter");
  await expect(x).toHaveValue("119");
});

test("the disabled field is no tab stop at all", async ({ page }) => {
  const opacity = spinbutton(page, "number-field-demo-opacity");
  const rate = spinbutton(page, "number-field-demo-readonly");

  // The width field between opacity and rate is disabled: its three stops —
  // input and two steppers — are walked straight past.
  await opacity.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(rate).toBeFocused();
});
