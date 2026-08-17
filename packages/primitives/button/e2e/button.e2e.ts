import { test, expect } from "@playwright/test";

// The loading state is a binding — `:disabled="disabled || loading"` and
// `aria-busy` in the template — and jsdom mounts those attributes fine, which
// is exactly why the unit suite cannot prove this contract: the danger is not
// that the attribute is absent but that it stops rendering, and a jsdom DOM
// with the attribute present is indistinguishable from a browser DOM with it.
// Only a browser drives the real click → loading swap and reads back the real
// disabled/aria-busy state, then waits out the kinetic reset.

test("a loading Button is DOM-disabled and aria-busy, and the reset clears both", async ({
  page,
}) => {
  await page.goto("/?component=button");

  // A role/name locator would stop resolving mid-film: while loading, the slot
  // goes `aria-hidden` and "Running…" becomes the accessible name. `hasText`
  // matches the raw textContent, which still carries the resting label, so the
  // same locator is valid at every phase of the swap.
  const button = page.locator("button").filter({ hasText: "Press to see loading" });
  await expect(button).toBeVisible();
  await expect(button).not.toBeDisabled();

  await button.click();

  // One click, three simultaneous facts: the native attribute, the busy flag
  // assistive tech announces, and the hook the loading paint is keyed off.
  await expect(button).toBeDisabled();
  await expect(button).toHaveAttribute("aria-busy", "true");
  await expect(button).toHaveAttribute("data-loading", "true");

  // The demo resets the flag after 1600ms; the label swap back is the proof
  // the film is over, and the same three facts are gone.
  await expect(button).not.toBeDisabled({ timeout: 5000 });
  await expect(button).not.toHaveAttribute("aria-busy");
  await expect(button).not.toHaveAttribute("data-loading");
});

test("an icon Button names itself by aria-label rather than by its glyph", async ({ page }) => {
  await page.goto("/?component=button");

  // The demo's `size="icon"` button is a lone glyph ("▶"), so without the
  // aria-label it would be unnamed in the accessibility tree. jsdom resolves
  // no accessibility tree at all; the accessible name is a browser-provable
  // fact.
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
});
