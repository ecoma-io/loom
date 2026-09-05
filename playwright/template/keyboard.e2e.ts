import { expect, test } from "@playwright/test";
import { waitForAppSettled } from "./settle.ts";
import { templateTargets } from "./template-targets.ts";

/**
 * The template tier's keyboard gate.
 *
 * Two checks, both generalized from `e2e/keyboard.e2e.ts` because a template's
 * markup is its own — the root suite keys on `.vp-doc table`, which no
 * template contains:
 *
 * 1. **Focus ring on click and Tab.** A real mouse click must clear the
 *    ring — the focus-visible contract every loom control carries — and the
 *    ring must then hold at **every** tab stop of the template's own chrome,
 *    walked from the top. The root suite verifies this per component demo;
 *    the template gate verifies it page-wide, where template-authored layout
 *    could suppress the ring without any single component being wrong. The
 *    walk form (rather than one Tab from the click target) is what makes the
 *    gate answerable on every template shape — #226 records the two shapes
 *    where a single Tab read `null` (last tab stop) or `"none"` (a popover
 *    dismissing focus back to its trigger).
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
      test("focus ring clears on mouse click and holds at every tab stop", async ({ page }) => {
        await page.goto(url);
        await page.locator("#app > *").first().waitFor();
        await waitForAppSettled(page);

        // Half one: a real mouse click clears the ring — the engine's
        // :focus-visible heuristics run for real rather than under a
        // synthetic focus() that always matches. The target is the first
        // button, not whichever element happens to be first in the tab
        // order: templates open on different first stops — the analytics
        // page's Reload button, the starter's in-page nav anchors — and a
        // page-level skip link keys its reveal and outline to plain
        // `:focus`, not `:focus-visible`, because focus arriving from
        // programmatic handoff is real focus. The button's ring is the
        // :focus-visible contract under test.
        const first = page.locator("#app button").first();
        await expect(first).toBeVisible();
        await first.click();
        expect(await first.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe("none");

        // Half two: the ring holds at EVERY tab stop of the template's own
        // chrome, walked from the top. The single-Tab form this replaces was
        // unanswerable on two real shapes (#226): a first button that is the
        // page's last tab stop — the starter's theme toggle, with AppShell's
        // `<aside>` before its `<header>` and nothing focusable in `main` —
        // sends the Tab out of the document and reads `null`; and a first
        // button that opens a popover — workspace-settings' `Select` trigger
        // — gets focus restored programmatically on dismissal, which does
        // not re-enter `:focus-visible` and reads `"none"`. Walking from a
        // blurred start reaches every control by keyboard, the path where
        // the brand ring (`global.css`'s `:focus-visible` outline) is meant
        // to appear, and answers both shapes deterministically — the toggle
        // is walked as a stop, the trigger is tabbed into, and neither the
        // click target nor the page shape can weaken what is asserted.
        await page.keyboard.press("Escape");
        await page.evaluate(() => {
          (document.activeElement as HTMLElement | null)?.blur();
        });
        // The click can restart the page's own async churn — analytics'
        // Reload re-runs `load()` and its skeleton swap, which the pre-click
        // settle already passed — and the census must census the settled
        // post-click page, not the swap. One more settle wait sits between
        // the click and the census for exactly that.
        await waitForAppSettled(page);

        const stopCount = await page.evaluate((): number => {
          return Array.from(
            document.querySelectorAll<HTMLElement>(
              "#app a[href], #app button, #app input, #app select, #app textarea, #app [tabindex]:not([tabindex='-1'])",
            ),
          ).filter((el) => !el.hasAttribute("disabled") && el.getClientRects().length > 0).length;
        });
        // A template with zero tab stops would make the walk vacuous, and
        // the census returning zero means the page above mounted nothing
        // interactive — loud failure, not a quiet pass.
        expect(stopCount, "the template's chrome must expose tab stops").toBeGreaterThan(0);

        for (let stop = 1; stop <= stopCount; stop++) {
          await page.keyboard.press("Tab");
          const ring = await page.evaluate(() => {
            const el = document.activeElement;
            if (!el || el === document.body) return null;
            return getComputedStyle(el).outlineStyle;
          });
          expect(
            ring,
            `tab stop ${String(stop)}/${String(stopCount)} must stay inside the document`,
          ).not.toBeNull();
          expect(ring).not.toBe("none");
        }
      });

      test("horizontally scrollable regions are keyboard-focusable at 375px", async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 800 });
        await page.goto(url);
        await page.locator("#app > *").first().waitFor();
        // The settle wait matters more here than the mount wait: DataGrid
        // assigns the scroll region's tabindex from a ResizeObserver callback
        // that lands after mount, and a census that ran before it would fail
        // a healthy page.
        await waitForAppSettled(page);

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
