import { test, expect, type Locator, type Page } from "@playwright/test";

// Surface renders a plain div — no role, no attributes to assert — so its
// contract is entirely visual: the variant paints a background, and the
// interactive variant signals "clickable" through the cursor. jsdom applies no
// stylesheet, so none of that exists there; computed style only does in a
// real browser with the theme's utilities resolved.

/**
 * The `Surface` element behind the demo heading `label`: the keyword is a
 * direct child (element or bare text node) of the Surface div, so its parent
 * is the one element that is always the Surface in every variant.
 */
function surfaceOf(page: Page, label: string): Locator {
  return page.getByText(label, { exact: true }).first().locator("xpath=..");
}

test("the interactive card is the only one with a pointer cursor", async ({ page }) => {
  await page.goto("/?component=surface");

  // The four `variant="card"` surfaces on the page: the three top cards, the
  // interactive one, and the pad ladder. Only the interactive one is clickable.
  const card = surfaceOf(page, "card");
  const interactive = surfaceOf(page, "interactive");
  await expect(interactive).toHaveClass(/cursor-pointer/);

  expect(await card.evaluate((el) => getComputedStyle(el).cursor)).toBe("auto");
  expect(await interactive.evaluate((el) => getComputedStyle(el).cursor)).toBe("pointer");
});

test("each elevation variant paints a distinct surface", async ({ page }) => {
  await page.goto("/?component=surface");

  const cardBg = await surfaceOf(page, "card").evaluate(
    (el) => getComputedStyle(el).backgroundColor,
  );
  const mutedBg = await surfaceOf(page, "muted").evaluate(
    (el) => getComputedStyle(el).backgroundColor,
  );

  // In this theme `card` and `overlay` are both paper-white, so the pair that
  // differs is card/muted — and the overlay's distinctness is the floating
  // shadow, which is what elevates it above a plain card.
  expect(cardBg).not.toBe(mutedBg);
  await expect(surfaceOf(page, "overlay")).not.toHaveCSS("box-shadow", "none");
  await expect(surfaceOf(page, "card")).toHaveCSS("box-shadow", "none");
});
