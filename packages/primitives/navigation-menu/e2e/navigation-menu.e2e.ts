import { expect, test, type Locator, type Page } from "@playwright/test";

// The navigation menu's keyboard-open was, until this spec, witnessed only by
// unit tests that dispatch `trigger("click")` — a real engine fires the click
// through the browser's own button activation, which is a different fact: it
// is the browser that turns Enter on a focused <button> into the click that
// opens the panel, and only a browser proves the wiring works with a key
// instead of a synthetic event. The rest of the contract is the wrapped Reka
// primitive's runtime behaviour — roving arrows along the bar, ArrowDown into
// the open panel, Escape back to the trigger — none of which jsdom runs.
//
// The demo is one bar: Products and Solutions open panels of links; Docs and
// Blog are plain links; a fifth item is disabled. A panel exists only while
// its item is the open one, so its first link is the panel's own witness.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=navigation-menu");
  await expect(productsTrigger(page)).toBeVisible();
});

/** The "Products" trigger — a panel-opening button in the bar. */
function productsTrigger(page: Page): Locator {
  return page.getByRole("button", { name: "Products" });
}

/** The "Solutions" trigger, the next panel-opening item along the bar. */
function solutionsTrigger(page: Page): Locator {
  return page.getByRole("button", { name: "Solutions" });
}

/** The Products panel's first link — mounted only while the panel is open. */
function firstPanelLink(page: Page): Locator {
  return page.getByRole("link", { name: "Analytics" });
}

test("Enter opens the panel, ArrowDown walks into its first link, and Escape returns to the trigger", async ({
  page,
}) => {
  const trigger = productsTrigger(page);
  await expect(trigger).toHaveAttribute("aria-haspopup", "menu");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");

  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(firstPanelLink(page)).toBeVisible();

  // The horizontal menu's entry key walks focus off the trigger and onto the
  // panel's first link — real focus, so the links are operable from there.
  await page.keyboard.press("ArrowDown");
  await expect(firstPanelLink(page)).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(firstPanelLink(page)).toBeHidden();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();
});

test("Enter on the open trigger closes it — the panel toggles under the same key that opened it", async ({
  page,
}) => {
  const trigger = productsTrigger(page);
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(firstPanelLink(page)).toBeVisible();

  await page.keyboard.press("Enter");
  await expect(firstPanelLink(page)).toBeHidden();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();
});

test("the arrows rove along the bar between triggers and links without opening a panel", async ({
  page,
}) => {
  await productsTrigger(page).focus();

  await page.keyboard.press("ArrowRight");
  await expect(solutionsTrigger(page)).toBeFocused();
  await expect(solutionsTrigger(page)).toHaveAttribute("aria-expanded", "false");

  // Backwards roving lands back on the first item, and the walk stops there
  // rather than wrapping — the bar has a first and a last stop.
  await page.keyboard.press("ArrowLeft");
  await expect(productsTrigger(page)).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(productsTrigger(page)).toBeFocused();

  // Plain links are part of the same walk: from Products the steps read
  // Solutions, Docs, Blog, and none of the movement opened a panel.
  await page.keyboard.press("ArrowRight");
  await expect(solutionsTrigger(page)).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("link", { name: "Docs" })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("link", { name: "Blog" })).toBeFocused();
  await expect(productsTrigger(page)).toHaveAttribute("aria-expanded", "false");
});
