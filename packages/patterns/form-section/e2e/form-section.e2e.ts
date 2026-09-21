import { expect, test, type Locator, type Page } from "@playwright/test";

// FormSection's browser-only fact is the band-scale of its field spacing:
// the Stack gap between fields steps one notch below `sm`, so the same
// `gap="md"` section resolves 16px between fields on a desktop and 12px on a
// phone. jsdom has no cascade, so FormSection.test.ts can pin the class
// pair but never the computed gap.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=form-section");
  await expect(page.getByText("Shipping address")).toBeVisible();
});

/** The demo's first section (`gap="md"`): its field stack — the element the
 *  gap class lives on. The section is a named fieldset, so the stack is the
 *  group's one div child (the description is a <p>); the fields are real
 *  label+input pairs now, so the text of "Street address" is a label inside
 *  a wrapper, no longer the stack's direct child. */
function fieldStack(page: Page): Locator {
  return page.getByRole("group", { name: "Shipping address" }).locator("> div");
}

test('the gap="md" fields resolve 16px apart past sm and 12px below it', async ({ page }) => {
  const stack = fieldStack(page);
  await page.setViewportSize({ width: 800, height: 900 });
  const above = await stack.evaluate((el) => Number.parseFloat(getComputedStyle(el).rowGap));
  await page.setViewportSize({ width: 360, height: 900 });
  const below = await stack.evaluate((el) => Number.parseFloat(getComputedStyle(el).rowGap));
  // gap-3 sm:gap-4 — the step, not two guesses.
  expect(above).toBe(16);
  expect(below).toBe(12);
});

test("Tab walks the group's fields in slot order and out of the section", async ({ page }) => {
  // The section is a container: naming and wiring are its own acts, the
  // fields' contracts belong to the fields — so the keyboard-operate duty is
  // passage through the group: focus must walk the fields in slot order and
  // leave the fieldset without a trap. jsdom can enumerate the inputs but
  // never prove a real Tab chain moves focus between them; seated by script
  // at the walk's first stop because the gesture under test is the Tab chain,
  // asserted per stop by identity.
  await page.setViewportSize({ width: 800, height: 900 });

  await page.getByLabel("Street address").focus();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("City")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Postal code")).toBeFocused();
  // The later sections host painted placeholders, not controls, so the stop
  // past the group is out of it entirely — the harness's trailing tab stop
  // follows the demo, and reaching it proves the fieldset released focus.
  await page.keyboard.press("Tab");
  await expect(page.locator("#harness-sentinel")).toBeFocused();
});
