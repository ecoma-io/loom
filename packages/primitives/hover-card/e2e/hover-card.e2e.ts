import { expect, test, type Locator, type Page } from "@playwright/test";

// The hover card's keyboard contract is the honest one its docblock states:
// the content is read-only by design — Reka strips `tabindex="-1"` onto every
// tabbable node inside on mount — so the gestures to witness are the four the
// sidecar names. Trigger focus opens the card (Reka binds onFocus to open),
// blur closes it after the close delay, Escape dismisses it in place, and Tab
// crosses from the trigger past the open card without entering or trapping.
// All four live outside jsdom: the timers, the focus binding and the layer
// dismissal are runtime behaviour.
//
// The demo's first card is the "@chelsea" preview; its content is the only
// text on the page carrying the "Full-stack developer" bio line, which is how
// the portaled card is scoped. The next tab stop after the trigger is the
// placement section's "Top" button.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=hover-card");
  await expect(page.getByRole("link", { name: "@chelsea" })).toBeVisible({ timeout: 20_000 });
});

/** The first card's trigger — the demo's first tab stop. */
function trigger(page: Page): Locator {
  return page.getByRole("link", { name: "@chelsea" });
}

/** The portaled card for that trigger, scoped by its unique content. */
function card(page: Page): Locator {
  return page.getByText("Full-stack developer. Building tools for the web.");
}

test("focus on the trigger opens the card, and Escape dismisses it without moving focus", async ({
  page,
}) => {
  // Seated by the keyboard itself: the trigger is the demo's first stop, so
  // the opening press witnesses the seat the rest hangs on. The card arrives
  // after the open delay, and the trigger's data-state carries the fact.
  await page.keyboard.press("Tab");
  await expect(trigger(page)).toBeFocused();
  await expect(trigger(page)).toHaveAttribute("data-state", "open");
  await expect(card(page)).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(card(page)).toBeHidden();
  await expect(trigger(page)).toHaveAttribute("data-state", "closed");

  // Dismissal is the layer's, not a focus move: the trigger stays seated.
  await expect(trigger(page)).toBeFocused();
});

test("Tab crosses the open card without entering or trapping, and the blur that follows closes it", async ({
  page,
}) => {
  await trigger(page).focus();
  await expect(card(page)).toBeVisible();

  // The card holds nothing tabbable — the mount-time strip removed the
  // ability in general and this card renders no control at all — so the walk
  // from the trigger lands on the page's next real stop, past the open card.
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Top" })).toBeFocused();

  // Focus has left the trigger, and the close delay runs out: the card goes
  // with it. A card that lingered past its dismissal would trap the next
  // reader's eye — and pointer — on a surface that no longer has a host.
  await expect(card(page)).toBeHidden({ timeout: 2_000 });
});

test("the open card offers no control for the keyboard to find", async ({ page }) => {
  await trigger(page).focus();
  await expect(card(page)).toBeVisible();

  // Exactly one card surface is mounted while this card is open — Presence
  // unmounts the closed ones — and inside it the walk would find nothing to
  // seat: no link, no button, no focusable node of any kind. This is the
  // read-only design asserted as a postcondition, not a docblock claim.
  const surfaces = page.locator(".z-overlay");
  await expect(surfaces).toHaveCount(1);
  await expect(
    surfaces.locator("a, button, input, select, textarea, [tabindex]:not([tabindex='-1'])"),
  ).toHaveCount(0);
});
