import { expect, test, type Locator, type Page } from "@playwright/test";

// This spec witnesses the half of the speed dial's keyboard contract that the
// pinned reka-ui@2.10.4 actually implements: Enter opens and toggles the fan,
// Escape closes it, focus stays with the trigger, and a rightward fan
// announces `aria-orientation="horizontal"` — Loom's own correction, since
// Reka hard-codes a menu's vertical axis and a screen reader would otherwise
// be told the opposite of the fan's shape. It deliberately does NOT witness
// the arrow walk or Enter-on-a-pill: opening the fan never moves focus into
// it (Reka's MenuContentImpl focuses its own content element and that focus
// never lands), so every arrow press — Reka's vertical keys and the
// `mirrorArrows` horizontal correction on SpeedDial's content alike — fires
// while focus is still on the trigger and reaches nothing. The pills are
// unreachable by keyboard, which is why the interaction register still holds
// the keyboard-operate exception for this component (the symptom class is
// reka-ui issue 1873 upstream). When that lands, this spec grows the walk and
// the activation witness, and the row retires.
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

/** The open fan; only one is open at a time, so the role is unambiguous. */
function fan(page: Page): Locator {
  return page.getByRole("menu");
}

test("Enter opens the fan, Enter again closes it, and focus stays with the trigger", async ({
  page,
}) => {
  await expect(upFanTrigger(page)).toHaveAttribute("aria-haspopup", "menu");
  await expect(upFanTrigger(page)).toHaveAttribute("aria-expanded", "false");

  await upFanTrigger(page).focus();
  await page.keyboard.press("Enter");
  await expect(upFanTrigger(page)).toHaveAttribute("aria-expanded", "true");
  await expect(fan(page)).toBeVisible();

  await page.keyboard.press("Enter");
  await expect(fan(page)).toBeHidden();
  await expect(upFanTrigger(page)).toHaveAttribute("aria-expanded", "false");
  await expect(upFanTrigger(page)).toBeFocused();
});

test("Escape closes the fan back onto the trigger", async ({ page }) => {
  await upFanTrigger(page).focus();
  await page.keyboard.press("Enter");
  await expect(fan(page)).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(fan(page)).toBeHidden();
  await expect(upFanTrigger(page)).toHaveAttribute("aria-expanded", "false");
  await expect(upFanTrigger(page)).toBeFocused();
});

test("a rightward fan announces the horizontal axis its pills stack on", async ({ page }) => {
  await rightFanTrigger(page).focus();
  await page.keyboard.press("Enter");
  await expect(fan(page)).toBeVisible();

  // The fan corrects Reka's vertical-only menu to its own axis, and says so
  // in aria-orientation — a screen reader is told horizontal before any
  // horizontal press could move the highlight.
  await expect(fan(page)).toHaveAttribute("aria-orientation", "horizontal");

  await page.keyboard.press("Escape");
  await expect(fan(page)).toBeHidden();
  await expect(rightFanTrigger(page)).toBeFocused();
});
