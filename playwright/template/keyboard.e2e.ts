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
        // Reload re-runs `load()` and its skeleton swap — and the walk must
        // follow the page as it settles rather than race it: the walk ends
        // on what it observes, not on a count sampled once.
        await waitForAppSettled(page);

        // One Tab press, then read the state that key press produced. The
        // ring probe mirrors how loom actually renders the ring: the brand
        // ring is the `global.css` `:focus-visible` outline, but composite
        // controls hang the visible ring on a wrapper — TextField is the
        // measured case (its `<input>` carries `outline-none`; the wrapper
        // carries `focus-within:outline-2`), so reading `activeElement`'s
        // own outline reports `none` while a real ring is on screen. The
        // probe walks up from the focused element, and the first ancestor
        // showing an outline is the ring the user sees. The visited mark is
        // a data attribute stamped on the element itself, so the wrap guard
        // is exact per element — two identical TextFields must not read as
        // "no progress" the way descriptor strings would.
        const tabToNextStop = async (): Promise<{
          at: string;
          visited: boolean;
          ring: string;
        } | null> => {
          await page.keyboard.press("Tab");
          return page.evaluate(() => {
            const el = document.activeElement;
            if (!el || el === document.body) return null;
            let ring = "none";
            for (
              let node: Element | null = el;
              node && node !== document.body;
              node = node.parentElement
            ) {
              const style = getComputedStyle(node).outlineStyle;
              if (style !== "none") {
                ring = style;
                break;
              }
            }
            const visited = el.hasAttribute("data-keyboard-gate-visited");
            el.setAttribute("data-keyboard-gate-visited", "");
            return {
              at:
                el.tagName.toLowerCase() +
                (el.id ? `#${el.id}` : "") +
                Array.from(el.classList)
                  .slice(0, 2)
                  .map((c) => `.${c}`)
                  .join(""),
              visited,
              ring,
            };
          });
        };

        // Walk the template's tab order from the top. Three exits keep this
        // terminating on every engine: focus leaving the document (Chromium
        // past the last stop — `activeElement` becomes `body`), any revisit
        // of a marked stop (engines that wrap instead of exiting), and —
        // since the first stop is asserted ringed below — the marked stop
        // condition also covers an engine that refuses to move focus.
        const firstStop = await tabToNextStop();
        if (firstStop === null) {
          throw new Error("the template's chrome must expose at least one tab stop");
        }
        expect(
          firstStop.ring,
          `tab stop 1 (${firstStop.at}) must show a visible focus ring`,
        ).not.toBe("none");
        let stop = 1;
        for (;;) {
          const state = await tabToNextStop();
          if (state === null) break;
          if (state.visited) break;
          stop++;
          expect(
            state.ring,
            `tab stop ${String(stop)} (${state.at}) must show a visible focus ring`,
          ).not.toBe("none");
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
