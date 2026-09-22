import { expect, test, type Locator, type Page } from "@playwright/test";

// This spec witnesses the half of the menu's keyboard contract that the pinned
// reka-ui@2.10.4 actually implements: Enter opens, Enter again and Escape
// close, and closing returns focus to the trigger. It deliberately does NOT
// witness the arrow walk or Enter-on-a-row: in this engine, opening the menu
// never moves focus into it — Reka's MenuContentImpl preventDefaults the mount
// focus event and focuses its own content element, and that focus never lands,
// so every arrow, Home/End and typeahead press fires while focus is still on
// the trigger and reaches nothing. The rows are unreachable by keyboard, which
// is why the interaction register still holds the keyboard-operate exception
// for this component (the symptom class is reka-ui issue 1873 upstream). When
// that lands, this spec grows the walk and the activation witness, and the
// row retires.
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

test("Enter opens the modal menu, Enter again closes it, and focus ends on the trigger", async ({
  page,
}) => {
  await expect(trigger(page)).toHaveAttribute("aria-haspopup", "menu");
  await expect(trigger(page)).toHaveAttribute("aria-expanded", "false");

  await trigger(page).focus();
  await page.keyboard.press("Enter");

  // Open: the menu is the page's only role-visible landmark, and the trigger
  // is gone from the accessibility tree — the modal menu hides the page
  // behind it rather than leaving both readable.
  await expect(openTrigger(page)).toHaveCount(1);
  await expect(trigger(page)).toHaveCount(0);
  await expect(menu(page)).toBeVisible();

  // The same key toggles: Enter on the trigger closes what it opened.
  await page.keyboard.press("Enter");
  await expect(menu(page)).toBeHidden();
  await expect(trigger(page)).toBeVisible();
  await expect(trigger(page)).toHaveAttribute("aria-expanded", "false");
  await expect(trigger(page)).toBeFocused();
});

test("Escape closes the menu and returns focus to the trigger", async ({ page }) => {
  await trigger(page).focus();
  await page.keyboard.press("Enter");
  await expect(menu(page)).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(menu(page)).toBeHidden();
  await expect(trigger(page)).toBeVisible();
  await expect(trigger(page)).toHaveAttribute("aria-expanded", "false");
  await expect(trigger(page)).toBeFocused();
});
