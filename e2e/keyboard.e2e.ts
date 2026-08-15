import { test, expect } from "@playwright/test";

import { documentationPages } from "./docs-pages";

// Component-owned keyboard traversal cases live beside their primitives. What
// remains here is cross-cutting browser evidence: input-modality styling and
// the docs site's phone-width keyboard reachability guarantee.

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

// Phone-width table focusability checks, split per page so each gets its own
// timeout and the VitePress preview server is not hit sequentially by one
// long-running test. A single test that looped over every documentation page
// timed out on WebKit (the slowest CI browser) once the page count grew.
//
// The width is the reason these tests exist. Every table on this site is a
// scroll container — VitePress styles `.vp-doc table` as `display: block;
// overflow-x: auto` — and whether one actually scrolls is a property of the
// viewport, not of the table: measured across the built site, 2 of 92 scroll
// at 1280px and 62 of 92 scroll at 375px. A desktop-only check therefore
// reports a site-wide keyboard defect as one stray page, which is exactly what
// it did before this test existed.
//
// Focusability is asserted rather than a full Tab walk. Tabbing to every table
// on 45 pages would spend minutes proving what the browser decides in one
// question — whether the element is in the tab order at all — and that
// question is the whole of WCAG 2.1.1 here. The failure this guards against is
// an element that no key press can reach, not one that is reached late.
//
// WebKit is the browser this test speaks for, and running it on Chromium alone
// would be worse than not running it: Chromium now makes a scroll container
// keyboard-focusable on its own, so `focus()` lands on an unfocusable table
// there and the check passes with the defect fully present. Verified by
// removing the `tabindex` and rerunning — green on Chromium, and eight named
// token tables on WebKit. `axe` says as much in its own rule text ("accessible
// by keyboard in Safari"). Keep this test on every project in
// `playwright.config.ts`; narrowing the suite to Chromium would silently
// retire it.
for (const path of documentationPages()) {
  const label = path === "." ? "/" : `/${path}`;

  test(`at 375px, ${label} has no scrollable table unreachable by keyboard`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(path);

    // One browser-side pass: find the tables that actually scroll, try to focus
    // each, and report whether focus landed. Done here rather than as a loop of
    // `locator.focus()` calls because the decision "does this one scroll" would
    // otherwise be a conditional in the test body, which
    // `playwright/no-conditional-in-test` rejects — and rightly, since a skipped
    // iteration and a passing one look identical from the outside.
    const results = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>(".vp-doc table")]
        .map((table, index) => ({ table, index }))
        .filter(({ table }) => table.scrollWidth > table.clientWidth)
        .map(({ table, index }) => {
          table.focus();
          return { index, focused: document.activeElement === table };
        }),
    );

    const unreachable = results
      .filter((result) => !result.focused)
      .map((result) => `table[${String(result.index)}]`);

    expect(unreachable, `scrollable but not focusable:\n${unreachable.join("\n")}`).toEqual([]);
  });
}

// Guards the guard: if a future stylesheet stops tables scrolling altogether,
// the per-page tests above would find nothing to check and pass while proving
// nothing. This is the assertion that would fail first. Checked against a few
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
