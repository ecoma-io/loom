import { test, expect } from "@playwright/test";

// Component-owned keyboard traversal cases live beside their primitives. What
// remains here is cross-cutting browser evidence: input-modality styling, and
// the guard that keeps the phone-width reachability gate in e2e/page-sweep
// honest. The per-page reachability gate itself lives there — one navigation
// per page carries it with the other three page-level gates.

test("the focus ring appears on keyboard entry and stays hidden after a mouse click", async ({
  page,
}) => {
  await page.goto("components/button");
  // Scoped to the "Variants" demo: both labels recur, unscoped, inside the
  // later "Every variant, size and state" gallery further down the page.
  // Primary and Secondary sit as adjacent siblings here with nothing
  // tabbable between them, which is what makes a single Tab press between
  // them a meaningful check.
  const variants = page.locator("figure").filter({ hasText: "Variants" });
  const primary = variants.getByRole("button", { name: "Primary", exact: true });
  const secondary = variants.getByRole("button", { name: "Secondary", exact: true });

  await primary.click();
  await expect(primary).toBeFocused();
  // `outlineStyle`, not `outlineWidth`: unlike `border-width`, a browser does
  // not resolve `outline-width` to `0px` just because `outline-style` is
  // `none` — Chromium reports its UA default width (observed: `3px`) either
  // way. `outline-style` is what actually gates whether anything paints, so
  // it is the property that tells the two cases apart.
  expect(await primary.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe("none");

  // A real Tab press is the only thing that can turn ":focus-visible" on:
  // jsdom neither renders styles nor tracks input modality, so this halo can
  // only be witnessed by an actual browser.
  await page.keyboard.press("Tab");
  await expect(secondary).toBeFocused();
  expect(await secondary.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe("none");
});

// Guards the guard: if a future stylesheet stops tables scrolling altogether,
// the per-page gate in page-sweep would find nothing to check and pass while
// proving nothing. This is the assertion that would fail first. Checked against a few
// known token-table pages rather than the whole site — any page with a design
// token table is guaranteed to overflow at phone width.
test("at 375px, at least one documentation table scrolls", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });

  // Foundation pages carry generated token tables that always overflow at
  // phone width.
  const tokenPages = ["foundations/colour", "foundations/typography", "foundations/shape"];
  let scrolling = 0;

  for (const path of tokenPages) {
    await page.goto(path);
    const count = await page.evaluate(
      () =>
        [...document.querySelectorAll<HTMLElement>(".vp-doc table")].filter(
          (table) => table.scrollWidth > table.clientWidth,
        ).length,
    );
    scrolling += count;
  }

  expect(
    scrolling,
    "no table scrolled at 375px — this test can no longer see what it checks",
  ).toBeGreaterThan(0);
});
