import { expect, test, type Locator, type Page } from "@playwright/test";

// The context menu's keyboard contract is a Loom-owned half of a Reka
// primitive: Reka's trigger binds the pointer gestures only, so the keyboard
// path — the trigger's keys, and the seat inside the open menu — is the
// wrapper's. This spec witnesses the whole of it in a browser, because neither
// half survives jsdom: jsdom accepts `focus()` on an element a browser refuses
// to focus, so the unit tier pins the wrapper's calls and cannot see whether a
// browser honours them.
//
// The demo's panel is the element a right-click lands on — a region, not a
// button — so the trigger is located by the attributes the wrapper puts on it
// rather than by role, and `toBeFocused` is what proves the seat.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=context-menu");
  await expect(trigger(page)).toBeVisible({ timeout: 20_000 });
});

/** The demo's first panel — the first tab stop, and the menu this spec drives. */
function trigger(page: Page): Locator {
  return page.locator("[data-state][aria-haspopup='menu']").first();
}

/** The open menu; Reka portals it to the body, and it exists only while open. */
function menu(page: Page): Locator {
  return page.getByRole("menu");
}

/** The open menu's rows, in the order a reader meets them. */
function rows(page: Page): Locator {
  return menu(page).getByRole("menuitem");
}

test("Shift+F10 opens the menu with its first command seated and highlighted", async ({ page }) => {
  // Seated by the keyboard itself: the panel is the demo's first tab stop, so
  // the opening press witnesses the seat the rest of the contract hangs on.
  await page.keyboard.press("Tab");
  await expect(trigger(page)).toBeFocused();
  await expect(trigger(page)).toHaveAttribute("aria-haspopup", "menu");

  await page.keyboard.press("Shift+F10");
  await expect(menu(page)).toBeVisible();

  // Focus lands inside the menu and on a real row, not on the menu element:
  // the first command is both focused and highlighted, which is the seat every
  // arrow press below continues from.
  const first = rows(page).first();
  await expect(first).toHaveText(/Cut/);
  await expect(first).toBeFocused();
  await expect(first).toHaveAttribute("data-highlighted", "");
});

test("the arrows walk the rows, typeahead reaches one, and Enter runs the row focus is on", async ({
  page,
}) => {
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(menu(page)).toBeVisible();

  // Two steps down: past Copy, and past the separator, which is not a row at
  // all — the walk never lands on one.
  await page.keyboard.press("ArrowDown");
  const copy = rows(page).nth(1);
  await expect(copy).toHaveText(/Copy/);
  await expect(copy).toBeFocused();

  await page.keyboard.press("ArrowDown");
  const paste = rows(page).nth(2);
  await expect(paste).toHaveText(/Paste/);
  await expect(paste).toBeFocused();

  // The walk came back up rather than stopping at the row it reached, so a
  // seat that latched on the first press would fail here.
  await page.keyboard.press("ArrowUp");
  await expect(copy).toBeFocused();

  // Typeahead reaches a row the arrows are not standing on, and moves the seat
  // there: the character key is a way in, not a highlight skip.
  await page.keyboard.press("p");
  await expect(paste).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(menu(page)).toBeHidden();
  // The command the keyboard landed on is the command the host received.
  await expect(page.getByText("Last command: paste")).toBeVisible();
});

test("Escape closes the menu and returns focus to the trigger", async ({ page }) => {
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+F10");
  await expect(menu(page)).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(menu(page)).toBeHidden();
  await expect(trigger(page)).toBeFocused();
});

test("Space opens the second panel too, and its disabled row is not a stop", async ({ page }) => {
  // The demo's second menu is the one carrying a disabled row and a danger
  // row, and the wrapper's defaults reach every instance rather than the first.
  const second = trigger(page).nth(1);
  await second.focus();
  await page.keyboard.press("Space");
  await expect(menu(page)).toBeVisible();
  await expect(rows(page).first()).toBeFocused();

  // Down to the disabled Paste row: reka skips it, so the highlight arrives at
  // Delete — one step past it, never onto it.
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  const last = rows(page).last();
  await expect(last).toHaveText(/Delete/);
  await expect(last).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(menu(page)).toBeHidden();
  await expect(second).toBeFocused();
});
