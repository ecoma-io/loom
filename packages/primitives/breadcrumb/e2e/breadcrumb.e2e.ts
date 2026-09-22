import { expect, test, type Locator, type Page } from "@playwright/test";

// Breadcrumb's browser-only fact is the passage its interaction claim owns:
// the trail is a nav of native anchors, so the keyboard contract is the
// browser's own Tab order — the trail's links walked in document order, the
// current page never seated. The current page is a span (`aria-current`,
// never a link), and the unit tier pins that markup; jsdom runs no Tab-key
// behaviour, so only a real browser can witness that the walk actually
// skips it.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=breadcrumb");
  // Three trails render, all named "Breadcrumb" — scoping every assertion to
  // one trail is what makes each stop an identity, not a count.
  await expect(page.getByRole("navigation", { name: "Breadcrumb" }).first()).toBeVisible();
});

/** One trail of the demo, by position. */
function trail(page: Page, index: number): Locator {
  return page.getByRole("navigation", { name: "Breadcrumb" }).nth(index);
}

test("Tab walks the trail's links in document order and never seats the current page", async ({
  page,
}) => {
  // Seated by the keyboard itself: the demo's first tabbable element is the
  // first trail's first link, so the opening press witnesses the seat the
  // whole walk hangs on.
  await page.keyboard.press("Tab");
  await expect(trail(page, 0).getByRole("link", { name: "Home" })).toBeFocused();

  // Crossing the trail boundary is the skip witness: the second press would
  // land on "Loom" if the current page were ever a tab stop, and landing on
  // the next trail's first link proves the walk stepped over it. The link
  // count pins the same fact structurally — the current page renders no
  // anchor at all.
  await page.keyboard.press("Tab");
  await expect(trail(page, 0).getByRole("link", { name: "Products" })).toBeFocused();
  await expect(trail(page, 0).getByRole("link", { name: "Loom" })).toHaveCount(0);
  await page.keyboard.press("Tab");
  await expect(trail(page, 1).getByRole("link", { name: "Dashboard" })).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(trail(page, 1).getByRole("link", { name: "Settings" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(trail(page, 2).getByRole("link", { name: "Home" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(trail(page, 2).getByRole("link", { name: "Products" })).toBeFocused();

  // The trail releases focus rather than trapping: the last link hands off to
  // the harness's trailing stop, which is the exit a keyboard user needs.
  await page.keyboard.press("Tab");
  await expect(page.locator("#harness-sentinel")).toBeFocused();
});
