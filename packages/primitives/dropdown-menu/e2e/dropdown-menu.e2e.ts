import { expect, test, type Locator, type Page } from "@playwright/test";

// The menu's whole keyboard contract in a browser: Enter opens and seats the
// first enabled command, the arrows walk the rows past the separator and the
// disabled entry without wrapping, Enter runs the command the walk is on, and
// Escape closes back onto the trigger.
//
// The seat belongs to the harness and not to the unit tier. Reka spends the
// mount focus on the menu's own content element, and whether that focus lands
// is what every key inside the menu reads — jsdom focuses a `tabindex="-1"`
// element without complaint, so the unit tier passes with the seat missing and
// the walk unreachable (#462).
//
// The demo's trigger is the "Actions" button. While the modal menu is open
// Reka aria-hides the page behind it — the trigger included — so role queries
// cannot see the trigger in the open state; that hiding is itself part of the
// modal contract and is asserted here rather than worked around.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=dropdown-menu");
  await expect(trigger(page)).toBeVisible();
});

/** The demo's menu button — the only "Actions" control on the harness page. */
function trigger(page: Page): Locator {
  return page.getByRole("button", { name: "Actions" });
}

/** The trigger as the DOM names it — visible to attribute queries even while the open menu aria-hides it. */
function openTrigger(page: Page): Locator {
  return page.locator('[aria-haspopup="menu"][aria-expanded="true"]');
}

/** The open menu; Reka portals it to the body, and it exists only while open. */
function menu(page: Page): Locator {
  return page.getByRole("menu");
}

/** One command row, by the label the demo gives it. */
function command(page: Page, label: string): Locator {
  return page.getByRole("menuitem", { name: label });
}

/** Open the menu the way a keyboard user does, and wait for its seat. */
async function openByKeyboard(page: Page): Promise<void> {
  await trigger(page).focus();
  await page.keyboard.press("Enter");
  await expect(menu(page)).toBeVisible();
}

test("Enter opens the modal menu onto the first enabled command", async ({ page }) => {
  await expect(trigger(page)).toHaveAttribute("aria-haspopup", "menu");
  await expect(trigger(page)).toHaveAttribute("aria-expanded", "false");

  await openByKeyboard(page);

  // Open: the menu is the page's only role-visible landmark, and the trigger
  // is gone from the accessibility tree — the modal menu hides the page
  // behind it rather than leaving both readable.
  await expect(openTrigger(page)).toHaveCount(1);
  await expect(trigger(page)).toHaveCount(0);

  // The seat: the first command, not the heading above it and not the menu
  // itself. Without it the arrows below have nothing to move.
  await expect(command(page, "Duplicate")).toBeFocused();
});

test("the arrows walk the commands past the separator and the disabled row", async ({ page }) => {
  await openByKeyboard(page);

  await page.keyboard.press("ArrowDown");
  await expect(command(page, "Rename")).toBeFocused();

  // The separator and the disabled row are chrome: one press crosses both.
  await page.keyboard.press("ArrowDown");
  await expect(command(page, "Export video")).toBeFocused();

  await page.keyboard.press("ArrowDown");
  await expect(command(page, "Delete scene")).toBeFocused();

  // The cursor stops at the end rather than wrapping — `loop` is off here.
  await page.keyboard.press("ArrowDown");
  await expect(command(page, "Delete scene")).toBeFocused();

  await page.keyboard.press("ArrowUp");
  await expect(command(page, "Export video")).toBeFocused();
});

test("Enter runs the command the walk is on, closing the menu onto the trigger", async ({
  page,
}) => {
  await openByKeyboard(page);

  await page.keyboard.press("ArrowDown");
  await expect(command(page, "Rename")).toBeFocused();

  await page.keyboard.press("Enter");

  // The command reached the host, once, with the value it carries.
  await expect(page.getByText("Last command: rename")).toBeVisible();

  // And the menu is gone with focus back where it came from.
  await expect(menu(page)).toBeHidden();
  await expect(trigger(page)).toHaveAttribute("aria-expanded", "false");
  await expect(trigger(page)).toBeFocused();
});

test("Escape closes the menu and returns focus to the trigger", async ({ page }) => {
  await openByKeyboard(page);

  await page.keyboard.press("Escape");
  await expect(menu(page)).toBeHidden();
  await expect(trigger(page)).toHaveAttribute("aria-expanded", "false");
  await expect(trigger(page)).toBeFocused();
});
