import { test, expect } from "@playwright/test";

// This file exists for one guarantee, and that guarantee is a coupling to a
// dependency's DOM rather than to anything Loom renders.
//
// `StepperRoot` writes its own "Step N of M" into a live region as a text node
// inside its render function. It takes no prop, exposes no slot and carries no
// attribute a binding on Loom's side could replace, so it is the one string in
// this library that is English however the host is localised. `Stepper.vue`
// renders a translatable region beside it, and `src/styles/global.css` removes
// Reka's from the box tree — see that file for why removal rather than
// `aria-hidden`.
//
// A unit test cannot pin any of that: jsdom applies no stylesheet, so both
// regions are equally present there and a rule that had stopped matching would
// look exactly like one that still did. What breaks it is real and quiet — a
// Reka upgrade that renames the role on its region, or a refactor that drops
// `data-loom-stepper` from the root — and the symptom is a screen reader
// saying the position twice, in two languages, which nothing else here would
// notice.

test("a Loom stepper exposes exactly one live region, and its words are Loom's", async ({
  page,
}) => {
  await page.goto("/?component=stepper");

  const stepper = page.locator("[data-loom-stepper]").first();
  await expect(stepper).toBeVisible();

  // `:visible` is the assertion. Both regions are in the DOM; only one of them
  // generates a box, and an element that generates no box is in no
  // accessibility tree. Reka's carries no `data-loom-live`, so if the rule
  // stopped applying this count would be two.
  const live = stepper.locator('[role="status"]:visible');
  await expect(live).toHaveCount(1);
  await expect(live).toHaveAttribute("data-loom-live", "");

  // Loom's English differs from Reka's by nothing but its source, so the count
  // above is what proves whose survived; this is what proves the survivor is
  // the one carrying a real position rather than an empty region.
  await expect(live).toHaveText(/Step \d+ of \d+/);
});

test("advancing the flow repaints the one live region rather than leaving it on the old step", async ({
  page,
}) => {
  await page.goto("/?component=stepper");

  const stepper = page.locator("[data-loom-stepper]").first();
  const live = stepper.locator("[data-loom-live]");
  const before = await live.textContent();

  // Whichever step is not the current one; a spine that reports the same
  // position after a move is a live region announcing nothing.
  await stepper.getByRole("button").last().click();
  await expect(live).not.toHaveText(before ?? "");
  await expect(stepper.locator('[role="status"]:visible')).toHaveCount(1);
});

// The stepper is Reka's composite under a Loom roving tab stop (see the
// `tabStop` computation in Stepper.vue). The interaction contract is the
// arrow-key traversal along the spine's axis plus Enter moving the flow —
// Reka's own key handler, real in a browser and absent from jsdom.

// The composite answer for the interaction claim: the arrow keys move real
// focus between the step triggers without a click, and Enter on a step
// advances the flow — witnessed by the demo's own "Current step: N" readout.
test("ArrowRight and ArrowLeft move real focus along the spine, and Enter selects a step", async ({
  page,
}) => {
  await page.goto("/?component=stepper");

  // The checkout stepper is `v-model` bound and prints "Current step: N".
  const checkout = page.locator("[data-loom-stepper]").first();
  const current = checkout.locator("p", { hasText: "Current step:" });
  await expect(checkout.locator('[role="status"]').first()).toHaveText(/Step \d of \d/);

  // Seated by script at the current step (tab-stop index 2). The gestures
  // under test are the arrow keys, not the seat.
  const triggers = checkout.getByRole("button");
  await triggers.nth(1).focus();

  await page.keyboard.press("ArrowRight");
  await expect(triggers.nth(2)).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(triggers.nth(1)).toBeFocused();

  // Enter on the *next* step takes the flow there: the live region repaints
  // and the page's readout follows the model.
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(current).toContainText("3");
});

// A linear spine hands the arrow keys the same gating the pointer gets: real
// focus never lands on a step the flow has not reached.
test("a linear spine refuses the arrow keys past the next step", async ({ page }) => {
  await page.goto("/?component=stepper");

  const linear = page.locator("[data-loom-stepper]").nth(1);
  const triggers = linear.getByRole("button");
  // The onboarding demo starts at step 1, so the linear rule allows steps 1
  // and 2; step 3 is beyond the furthest point the flow has earned.
  await triggers.nth(0).focus();

  // ArrowRight lands on the next *allowed* step — step 2, exactly as far as
  // the flow goes.
  await page.keyboard.press("ArrowRight");
  await expect(triggers.nth(1)).toBeFocused();

  // One more ArrowRight must not carry focus to step 3: the step past the
  // flow's frontier is unreachable by either pointer or arrow.
  await page.keyboard.press("ArrowRight");
  await expect(triggers.nth(2)).not.toBeFocused();
});
