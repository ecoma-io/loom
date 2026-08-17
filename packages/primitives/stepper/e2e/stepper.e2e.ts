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
