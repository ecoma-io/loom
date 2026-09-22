import { expect, test, type Locator, type Page } from "@playwright/test";

// The popover's keyboard contract is the one its claim names — open state,
// dismissal, focus routing — and all three halves live outside jsdom: the
// trigger is the caller's own native button, so Enter opens it through the
// browser's activation; on open, focus moves to the panel's first tabbable
// control; the panel's Tab walk and Space operate its controls; and Escape
// closes it and focus returns to the trigger.
//
// The demo's first popover is the controlled "Filters" panel with two
// checkboxes inside — real tabbable content, so the focus routing has
// something honest to land on.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=popover");
  await expect(trigger(page)).toBeVisible();
});

/** The demo's first popover trigger — the "Filters" button. */
function trigger(page: Page): Locator {
  return page.getByRole("button", { name: "Filters" });
}

/** The panel for one open — Reka portals it, so it is scoped by its content. */
function panel(page: Page): Locator {
  return page.getByRole("dialog").filter({ has: page.getByText("Show") });
}

test("Enter opens the panel, focus lands on its first control, and Escape closes it back onto the trigger", async ({
  page,
}) => {
  await expect(trigger(page)).toHaveAttribute("aria-haspopup", "dialog");
  await expect(trigger(page)).toHaveAttribute("aria-expanded", "false");

  // Seated by the keyboard itself: the Filters button is the demo's first
  // tab stop, so the opening press witnesses the seat the rest hangs on.
  await page.keyboard.press("Tab");
  await expect(trigger(page)).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(trigger(page)).toHaveAttribute("aria-expanded", "true");
  await expect(panel(page)).toBeVisible();

  // Opening routes focus into the panel — the first tabbable control in it.
  const drafts = page.getByRole("checkbox", { name: "Drafts" });
  await expect(drafts).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(panel(page)).toBeHidden();
  await expect(trigger(page)).toHaveAttribute("aria-expanded", "false");
  await expect(trigger(page)).toBeFocused();
});

test("the panel's Tab walk cycles its controls, Space toggles them, and Escape is the exit", async ({
  page,
}) => {
  await trigger(page).focus();
  await page.keyboard.press("Enter");
  await expect(panel(page)).toBeVisible();

  const drafts = page.getByRole("checkbox", { name: "Drafts" });
  const archived = page.getByRole("checkbox", { name: "Archived" });
  await expect(drafts).toBeFocused();

  // Inside the panel Tab walks its own controls, and Space operates them —
  // the activation half of the keyboard contract, which jsdom cannot run.
  await page.keyboard.press("Tab");
  await expect(archived).toBeFocused();
  await page.keyboard.press("Space");
  await expect(archived).toBeChecked();

  // At the last control the walk wraps to the first: the pinned Reka keeps a
  // popover panel's Tab walk inside its own controls (its FocusScope loops),
  // so Escape — witnessed in the spec above — is the keyboard exit rather
  // than Tab crossing the boundary. Recorded here as the engine's real
  // boundary behaviour, not as the pattern's recommendation.
  await page.keyboard.press("Tab");
  await expect(drafts).toBeFocused();
});
