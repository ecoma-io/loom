import { expect, test } from "@playwright/test";
import { waitForAppSettled } from "./settle.ts";
import { templateTargets } from "./template-targets.ts";

/**
 * The template tier's responsive gate.
 *
 * The root suite's `e2e/layout-responsive.e2e.ts` verifies loom's own layout
 * components stack and split — per-component evidence. A template composes
 * those components under template-authored chrome, and nothing else verifies
 * that composition survives real viewports. The generic invariant a template
 * must hold at any width is page-level: the document must never require
 * horizontal scrolling. A horizontally scrolling page at phone width is the
 * canonical responsive defect, and unlike per-layout assertions it needs no
 * knowledge of any template's internals, so it generalizes across templates
 * discovered tomorrow without editing this file.
 *
 * The template contract asks for usable phone support; 320px is the narrowest
 * mainstream phone class and 768px the tablet class. The 1px tolerance
 * absorbs sub-pixel rounding of fractional widths.
 */

const VIEWPORTS = [
  { width: 320, height: 800 },
  { width: 768, height: 800 },
] as const;

const targets = templateTargets();

if (targets.length === 0) {
  test("no templates to test", () => {
    // Intentionally empty — the test passes to keep CI green.
  });
} else {
  for (const target of targets) {
    const url = `http://localhost:${String(target.port)}${target.route}`;

    test.describe(target.id, () => {
      for (const viewport of VIEWPORTS) {
        test(`no horizontal document overflow at ${String(viewport.width)}px`, async ({ page }) => {
          await page.setViewportSize(viewport);
          await page.goto(url);
          await page.locator("#app > *").first().waitFor();
          // Measure the settled markup: the dashboard mounts after saas-shell's
          // loading skeleton swaps out, and the grid is exactly the element
          // whose width the invariant is about.
          await waitForAppSettled(page);
          const overflow = await page.evaluate(() => {
            const doc = document.documentElement;
            return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
          });
          expect(
            overflow.scrollWidth,
            `document must not scroll horizontally at ${String(viewport.width)}px`,
          ).toBeLessThanOrEqual(overflow.clientWidth + 1);
        });
      }
    });
  }
}
