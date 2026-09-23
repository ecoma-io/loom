import { expect, test, type Locator, type Page } from "@playwright/test";

// The fan's whole keyboard contract in a browser: Enter opens and seats the
// first action, the arrows walk the pills without wrapping, Enter runs the
// action the walk is on, Escape closes back onto the trigger — and on a
// rightward fan the horizontal keys are the ones that move the walk, which is
// Loom's own correction: Reka hard-codes a menu's vertical axis and its
// `aria-orientation` with it, so without that correction a reader is told the
// opposite of the fan's shape and the keys that work are not the keys they
// were told.
//
// The seat belongs to the harness and not to the unit tier. Reka spends the
// mount focus on the fan's own content element, and whether that focus lands
// is what every key here reads — jsdom focuses a `tabindex="-1"` element
// without complaint, so the unit tier passes with the seat missing and the
// pills unreachable (#462).
//
// The demo mounts three fans; only one is open at a time, so the menu role is
// unambiguous.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=speed-dial");
  await expect(upFanTrigger(page)).toBeVisible();
});

/** The first fan's trigger — the round "Create" button. */
function upFanTrigger(page: Page): Locator {
  return page.getByRole("button", { name: "Create", exact: true });
}

/** The rightward fan's trigger. */
function rightFanTrigger(page: Page): Locator {
  return page.getByRole("button", { name: "Create, opening rightward" });
}

/** The fan of the host-driven example, whose third action is disabled. */
function sceneFanTrigger(page: Page): Locator {
  return page.getByRole("button", { name: "Scene actions" });
}

/** The open fan; only one is open at a time, so the role is unambiguous. */
function fan(page: Page): Locator {
  return page.getByRole("menu");
}

/** One action pill, by the label the demo gives it. */
function action(page: Page, label: string): Locator {
  return page.getByRole("menuitem", { name: label });
}

/** Open a fan the way a keyboard user does, and wait for its seat. */
async function openByKeyboard(page: Page, trigger: Locator): Promise<void> {
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(fan(page)).toBeVisible();
}

test("Enter opens the fan onto its first action", async ({ page }) => {
  await expect(upFanTrigger(page)).toHaveAttribute("aria-haspopup", "menu");
  await expect(upFanTrigger(page)).toHaveAttribute("aria-expanded", "false");

  await openByKeyboard(page, upFanTrigger(page));
  await expect(upFanTrigger(page)).toHaveAttribute("aria-expanded", "true");

  // The seat: the first pill, not the fan it sits in. Without it the arrows
  // below have nothing to move.
  await expect(action(page, "New document")).toBeFocused();
});

test("the arrows walk the pills and stop at the ends", async ({ page }) => {
  await openByKeyboard(page, upFanTrigger(page));

  await page.keyboard.press("ArrowDown");
  await expect(action(page, "Invite a teammate")).toBeFocused();

  await page.keyboard.press("ArrowDown");
  await expect(action(page, "Upload a file")).toBeFocused();

  // The last pill is the end of the fan, not a ring — the cursor halts.
  await page.keyboard.press("ArrowDown");
  await expect(action(page, "Upload a file")).toBeFocused();

  await page.keyboard.press("ArrowUp");
  await expect(action(page, "Invite a teammate")).toBeFocused();
});

test("a rightward fan walks on its own axis, not the one Reka assumes", async ({ page }) => {
  await openByKeyboard(page, rightFanTrigger(page));

  // The fan corrects Reka's vertical-only menu to its own axis, and says so
  // in aria-orientation — a screen reader is told horizontal before any
  // horizontal press could move the highlight.
  await expect(fan(page)).toHaveAttribute("aria-orientation", "horizontal");

  // And the axis is real, not only announced: ArrowRight moves the walk.
  await page.keyboard.press("ArrowRight");
  await expect(action(page, "Invite a teammate")).toBeFocused();

  await page.keyboard.press("ArrowLeft");
  await expect(action(page, "New document")).toBeFocused();
});

test("the walk skips a disabled action", async ({ page }) => {
  await openByKeyboard(page, sceneFanTrigger(page));

  await page.keyboard.press("ArrowDown");
  await expect(action(page, "Rename")).toBeFocused();

  // "Delete" is disabled — visible, announced, and not a place the walk stops.
  await page.keyboard.press("ArrowDown");
  await expect(action(page, "Rename")).toBeFocused();
  await expect(action(page, "Delete")).toHaveAttribute("aria-disabled", "true");
});

test("Enter runs the action the walk is on, closing the fan onto the trigger", async ({ page }) => {
  await openByKeyboard(page, upFanTrigger(page));

  await page.keyboard.press("ArrowDown");
  await expect(action(page, "Invite a teammate")).toBeFocused();

  await page.keyboard.press("Enter");

  // The action reached the host, with the index it carries.
  await expect(page.getByText("Last action: Invite a teammate (index 1)")).toBeVisible();

  // And the fan is gone with focus back where it came from.
  await expect(fan(page)).toBeHidden();
  await expect(upFanTrigger(page)).toHaveAttribute("aria-expanded", "false");
  await expect(upFanTrigger(page)).toBeFocused();
});

test("Escape closes the fan back onto the trigger", async ({ page }) => {
  await openByKeyboard(page, upFanTrigger(page));

  await page.keyboard.press("Escape");
  await expect(fan(page)).toBeHidden();
  await expect(upFanTrigger(page)).toHaveAttribute("aria-expanded", "false");
  await expect(upFanTrigger(page)).toBeFocused();
});
