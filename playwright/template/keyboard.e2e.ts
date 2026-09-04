import { expect, test } from "@playwright/test";
import { templateTargets } from "./template-targets.ts";

/**
 * The template tier's keyboard gate.
 *
 * Two checks, both generalized from `e2e/keyboard.e2e.ts` because a template's
 * markup is its own — the root suite keys on `.vp-doc table`, which no
 * template contains:
 *
 * 1. **Focus ring on Tab.** A real mouse click must clear the ring and a Tab
 *    must restore it — the focus-visible contract every loom control carries.
 *    The root suite verifies this per component demo; the template gate
 *    verifies it on the template's own chrome, where template-authored layout
 *    could suppress the ring without any single component being wrong.
 *
 * 2. **Scrollable regions are focusable at 375px.** Any element that actually
 *    scrolls horizontally at 375px must be reachable by keyboard focus —
 *    a region you can only reach with a mouse is a WCAG 2.1.1 failure.
 *
 * WebKit is the engine this suite speaks for: Chromium makes a scroll
 * container keyboard-focusable on its own, so the focusability check passes
 * there with the defect fully present. It is the reason the `template`
 * scenario runs the `standard` profile rather than `smoke`.
 */

// Selectors mirror Playwright's own tabbability rules: natively focusable
// elements that are not disabled, plus any explicit non-negative tabindex.
const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ScrollableReport {
  selector: string;
  focusable: boolean;
}

const targets = templateTargets();

if (targets.length === 0) {
  test("no templates to test", () => {
    // Intentionally empty — the test passes to keep CI green.
  });
} else {
  for (const target of targets) {
    const url = `http://localhost:${String(target.port)}${target.route}`;

    test.describe(target.id, () => {
      test("focus ring clears on mouse click and restores on Tab", async ({ page }) => {
        await page.goto(url);
        await page.locator("#app > *").first().waitFor();

        // The first tabbable element of the mounted app. Every template
        // carries at least one — the starter's theme toggle alone qualifies —
        // but a miss must fail loudly here rather than skip silently.
        const first = page.locator(`#app ${TABBABLE}`).first();
        await expect(first).toBeVisible();

        // A real mouse click, so the engine's :focus-visible heuristics run
        // for real rather than under a synthetic focus() that always matches.
        await first.click();
        expect(await first.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe("none");

        // Tab moves focus to the next tabbable element, which must now show
        // the ring. Checked on whatever received focus — after a click that
        // opens a menu or popover that is legitimately a control inside it.
        await page.keyboard.press("Tab");
        const ring = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          return getComputedStyle(el).outlineStyle;
        });
        expect(ring, "Tab after a mouse click must move focus to a visible ring").not.toBeNull();
        expect(ring).not.toBe("none");
      });

      test("horizontally scrollable regions are keyboard-focusable at 375px", async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 800 });
        await page.goto(url);
        await page.locator("#app > *").first().waitFor();

        // Find the elements that actually scroll horizontally: an explicit
        // overflow-x scroll container whose content is wider than its box.
        // `overflow-x: visible` elements can also report
        // scrollWidth > clientWidth without scrolling, so the computed
        // overflow is what makes this an honest scroll-container census.
        const scrollable = await page.evaluate((): ScrollableReport[] => {
          const wide = Array.from(document.querySelectorAll<HTMLElement>("#app *")).filter((el) => {
            const style = getComputedStyle(el);
            return (
              (style.overflowX === "auto" || style.overflowX === "scroll") &&
              el.scrollWidth > el.clientWidth
            );
          });
          return wide.map((el) => {
            el.focus({ preventScroll: true });
            const focusable = document.activeElement === el;
            const described =
              el.tagName.toLowerCase() +
              (el.id ? `#${el.id}` : "") +
              Array.from(el.classList)
                .slice(0, 3)
                .map((c) => `.${c}`)
                .join("");
            return { selector: described, focusable };
          });
        });

        // No scroll containers at 375px is a legitimate shape — the census is
        // then empty and there is nothing to hold. The template gate would be
        // vacuous only if it also asserted that one exists, which it does not:
        // a template without horizontal overflow has no defect of this kind.
        for (const region of scrollable) {
          expect(
            region.focusable,
            `scrollable region must be keyboard-focusable: ${region.selector}`,
          ).toBe(true);
        }
      });
    });
  }
}
