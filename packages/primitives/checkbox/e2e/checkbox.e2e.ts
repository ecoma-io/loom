import { test, expect } from "@playwright/test";

// Checkbox's aria-checked is written by Reka and resolved by its own click
// handler — including the third state, where "indeterminate" renders as
// aria-checked="mixed" and resolves to checked on the next activation. jsdom
// pins those attributes at rest, but WCAG 2.1.1 asks whether a real keypress
// MOVES them, and only a browser answers that.
//
// Space is the key below, deliberately not Enter: Reka swallows Enter on the
// box (the native <button> it renders would otherwise fire a click for it),
// which is the checkbox convention — the control's activation key is Space.

test("Space flips an unchecked box's aria-checked both ways", async ({ page }) => {
  await page.goto("/?component=checkbox");

  const box = page.getByRole("checkbox", { name: "Unchecked", exact: true });
  await expect(box).toHaveAttribute("aria-checked", "false");

  await box.focus();
  await page.keyboard.press("Space");
  await expect(box).toHaveAttribute("aria-checked", "true");

  // The return flip, not a second sample of the first: a state that latched
  // would pass the assertion above and fail a real form.
  await page.keyboard.press("Space");
  await expect(box).toHaveAttribute("aria-checked", "false");
});

test("Space resolves the indeterminate parent to checked", async ({ page }) => {
  await page.goto("/?component=checkbox");

  const parent = page.getByRole("checkbox", { name: /Indeterminate/ });
  await expect(parent).toHaveAttribute("aria-checked", "mixed");

  await parent.focus();
  await page.keyboard.press("Space");
  await expect(parent).toHaveAttribute("aria-checked", "true");
});
