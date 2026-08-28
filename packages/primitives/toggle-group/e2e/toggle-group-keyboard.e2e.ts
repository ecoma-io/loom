import { test, expect } from "@playwright/test";

test("ToggleGroup's arrow keys move focus past a disabled button without flipping anything, and the group is one real Tab stop", async ({
  page,
}) => {
  await page.goto("/?component=toggle-group");
  const bold = page.getByRole("button", { name: "Bold", exact: true });
  await bold.click();
  await expect(bold).toBeFocused();
  await expect(bold).toHaveAttribute("aria-pressed", "true");

  // Reka's commit timer needs a real held-key interval; a zero-duration
  // synthetic press loses this race (see the SegmentedControl case).
  await page.keyboard.press("ArrowRight", { delay: 50 });
  const italic = page.getByRole("button", { name: "Italic", exact: true });
  await expect(italic).toBeFocused();
  // Focus moved; the value did not — toggles flip on Space, not on travel.
  await expect(italic).toHaveAttribute("aria-pressed", "false");

  await page.keyboard.press("Space");
  await expect(italic).toHaveAttribute("aria-pressed", "true");

  // The third button is disabled, so wrapping off the end skips it and lands
  // back on Bold — the same skip the RadioGroup pins, and the reason the
  // assertion lives here rather than in the browserless tier: roving focus
  // asks the engine which candidates are disabled, which jsdom cannot answer.
  await page.keyboard.press("ArrowRight", { delay: 50 });
  await expect(bold).toBeFocused();

  // Tab leaves the group for the demo's next control: the View group's first
  // button, pinned by name. A `role`-attribute read of `activeElement` cannot
  // judge this landing — a plain `<button>` carries no role — so the
  // assertion targets the element itself.
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Grid", exact: true })).toBeFocused();
});
