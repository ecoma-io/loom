import { expect, test, type Locator, type Page } from "@playwright/test";

// The accordion's keyboard contract is the wrapped Reka primitive's runtime
// behaviour: each trigger is a native <button>, so Enter and Space toggle it
// without any key handler of Reka's own, and the arrow keys move real focus
// between the triggers from the item wrapper's keydown — jsdom runs neither
// the native activation nor the focus movement, which is why the unit tier
// could only assert the markup.
//
// The harness mounts the demo at `/?component=accordion`, which renders the
// single accordion, the multiple one and three gap-sized ones that reuse the
// same labels — every locator below scopes to one box by a label only that
// box carries ("FAQ" is single-only, "Security" is multiple-only).

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=accordion");
  await expect(singleBox(page).getByRole("button", { name: "Overview" })).toBeVisible();
});

/** The single accordion's container — the only demo box holding the FAQ section. */
function singleBox(page: Page): Locator {
  return page.locator(".rounded.border").filter({ has: page.getByRole("button", { name: "FAQ" }) });
}

/** The multiple accordion's container — the only demo box holding Security. */
function multipleBox(page: Page): Locator {
  return page
    .locator(".rounded.border")
    .filter({ has: page.getByRole("button", { name: "Security" }) });
}

test("Tab seats the first trigger, Enter opens its panel, and Enter again closes it", async ({
  page,
}) => {
  const overview = singleBox(page).getByRole("button", { name: "Overview" });
  const panel = singleBox(page).getByRole("region", { name: "Overview" });

  // Seated by the keyboard itself: nothing above the accordion takes focus, so
  // the first Tab witnesses the seat the rest of the walk hangs on.
  await page.keyboard.press("Tab");
  await expect(overview).toBeFocused();
  await expect(overview).toHaveAttribute("aria-expanded", "false");

  await page.keyboard.press("Enter");
  await expect(overview).toHaveAttribute("aria-expanded", "true");
  await expect(panel).toBeVisible();

  // Collapsible single mode: the open item can close again, and focus stays on
  // the trigger that toggled it.
  await page.keyboard.press("Enter");
  await expect(overview).toHaveAttribute("aria-expanded", "false");
  await expect(panel).toBeHidden();
});

test("the arrow keys move real focus between triggers, Home jumps to the first, and the disabled section never seats", async ({
  page,
}) => {
  const triggers = singleBox(page).getByRole("button");
  const faq = singleBox(page).getByRole("button", { name: "FAQ" });

  await triggers.first().focus();
  await page.keyboard.press("ArrowDown");
  await expect(triggers.nth(1)).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(triggers.nth(2)).toBeFocused();
  await expect(faq).toHaveAttribute("disabled");
  await expect(faq).toHaveAttribute("aria-disabled", "true");

  // Home walks back to the first trigger along the spine, not to the page top.
  await page.keyboard.press("Home");
  await expect(triggers.first()).toBeFocused();

  // ArrowDown past the disabled section lands on the next focusable trigger
  // rather than on the one announcing itself unavailable.
  await triggers.nth(2).focus();
  await page.keyboard.press("ArrowDown");
  await expect(faq).not.toBeFocused();
  await expect(triggers.first()).toBeFocused();
});

test("opening one section collapses the previous one in single mode, and two stay open in multiple mode", async ({
  page,
}) => {
  const overview = singleBox(page).getByRole("button", { name: "Overview" });
  const features = singleBox(page).getByRole("button", { name: "Features" });

  await overview.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowDown");
  await expect(features).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(features).toHaveAttribute("aria-expanded", "true");
  await expect(singleBox(page).getByRole("region", { name: "Features" })).toBeVisible();
  await expect(overview).toHaveAttribute("aria-expanded", "false");
  await expect(singleBox(page).getByRole("region", { name: "Overview" })).toBeHidden();

  // Multiple mode releases the one-at-a-time rule: the arrows walk to the
  // next trigger, Enter opens each section, and both panels hold their state.
  const account = multipleBox(page).getByRole("button", { name: "Account settings" });
  const notifications = multipleBox(page).getByRole("button", { name: "Notifications" });
  await account.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowDown");
  await expect(notifications).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(multipleBox(page).getByRole("region", { name: "Account settings" })).toBeVisible();
  await expect(multipleBox(page).getByRole("region", { name: "Notifications" })).toBeVisible();
});
