import { test, expect, type Page } from "@playwright/test";

/**
 * The role of whatever currently holds focus, or `null` outside a styled
 * control. Read through `document.activeElement` rather than a `:focus`
 * locator: the harness mounts no chrome, so once Tab leaves the group focus
 * falls on `<body>`, which a strict `:focus` locator cannot even match as a
 * resolvable element.
 */
async function focusedLabel(page: Page): Promise<string | null> {
  return page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? null);
}

// A Rating is a RadioGroup underneath: the row is one Tab stop with roving
// focus, and the arrow keys move between steps and select as they go. All of
// that is Reka's own DOM and focus machinery, which jsdom neither renders nor
// runs — the value can be asserted there, but never the radio semantics or the
// keyboard.

test("clicking a star checks it, and the group's focus roves on ArrowRight", async ({ page }) => {
  await page.goto("/?component=rating");

  // The "whole stars, previewing under the pointer" demo — a `hoverable`,
  // whole-step rating starting at 3.
  const group = page.getByRole("radiogroup", { name: /whole stars/ });
  const stars = group.getByRole("radio");
  await expect(stars).toHaveCount(5);

  // Every step is a real `<button role="radio">` — a jsdom assertion could not
  // prove that, because there is no native `role` attribute in the source to
  // inspect; the role is Reka's runtime output.
  for (let i = 0; i < 5; i++) {
    await expect(stars.nth(i)).toHaveAttribute("role", "radio");
  }

  await expect(stars.nth(2)).toHaveAttribute("aria-checked", "true");

  // Clicking the fourth star checks it, takes focus, and moves the roving
  // tab stop with the value.
  await stars.nth(3).click();
  await expect(stars.nth(3)).toHaveAttribute("aria-checked", "true");
  await expect(stars.nth(3)).toBeFocused();

  // ArrowRight selects and moves on — the roving focus a browser resolves and
  // jsdom cannot. The chosen star is the row's single Tab stop.
  await page.keyboard.press("ArrowRight");
  expect(await focusedLabel(page)).toBe("5 of 5 stars");
  await expect(stars.nth(4)).toHaveAttribute("tabindex", "0");
});

test("a disabled rating's stars are disabled, and the group drops out of the tab order", async ({
  page,
}) => {
  await page.goto("/?component=rating");

  const group = page.getByRole("radiogroup", { name: /disabled/ });
  const stars = group.getByRole("radio");
  await expect(stars).toHaveCount(5);

  // `disabled` must reach the real buttons, not just paint the row: a native
  // disabled button refuses the pointer and the keyboard on its own, which is
  // the browser behaviour a unit test cannot conjure.
  for (let i = 0; i < 5; i++) {
    await expect(stars.nth(i)).toBeDisabled();
  }

  // The group's own tabindex is -1, so it is no Tab stop at all.
  await expect(group).toHaveAttribute("tabindex", "-1");
});
