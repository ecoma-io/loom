import { expect, type Page } from "@playwright/test";

/**
 * The root suite's theme-reuse mode, and the gate that keeps it honest.
 *
 * `LOOM_E2E_REUSE_THEME=1` collapses each documentation page's two full
 * navigations (light, then dark) into one: the light pass proves the page's
 * semantics and geometry, the dark pass reaches dark on the same DOM through
 * VitePress's own appearance toggle and re-runs only the color-dependent
 * checks, per the 2026-08-26 measurement recorded beside the dark scan in
 * accessibility.e2e.ts. Unset — the default, in CI and locally — both specs
 * keep their two navigations, byte-for-byte the same titles and phases, so
 * the timings JSONL join and CI history stay comparable across the A/B.
 *
 * The collapse is equivalent coverage only while one premise holds: that
 * reaching dark changes no DOM byte outside the three known theme markers.
 * That premise was measured once; `reachDark` asserts it on every page it
 * actually collapses, so a future VitePress or Demo.vue change that lets the
 * themes' DOM diverge turns the suite red instead of silently weakening the
 * dark pass.
 */

/**
 * Only the literal `1` collapses the suite; every other value, `0` and unset
 * included, is the production shape. A benchmark that believed it had enabled
 * the mode but had not must read as unchanged numbers, never as an A/B result
 * about a mode that did not run.
 */
export const REUSE_THEME = process.env.LOOM_E2E_REUSE_THEME === "1";

/**
 * Strip the three theme markers a VitePress appearance flip is allowed to
 * change, so the two `page.content()` captures on either side of the toggle
 * compare equal exactly when the reuse premise holds:
 *
 * - `data-theme` on the html element — Layout.vue's watchEffect mirrors the
 *   reactive theme onto it;
 * - the `dark` class token on the html element — VitePress's inline script
 *   toggles it before first paint;
 * - `title`/`aria-checked` on the appearance-toggle buttons — the switch's
 *   accessible name and state, non-empty in both themes, flipped.
 *
 * The strips are scoped to the html open tag and the toggle buttons rather
 * than applied to these attribute names wherever they appear: normalization
 * that reaches past the known markers would call a genuinely divergent DOM
 * green, and an element whose `title` changes with the theme is exactly the
 * drift this gate exists to catch.
 */
function withoutThemeMarkers(html: string): string {
  return html
    .replace(
      /<html\b([^>]*)>/,
      (_open, attrs: string) =>
        `<html${attrs
          .replace(/\sdata-theme="[^"]*"/, "")
          .replace(/\sclass="([^"]*)"/, (_class, tokens: string) => {
            const kept = tokens
              .split(/\s+/)
              .filter((token) => token !== "dark")
              .join(" ");
            // The attribute goes when its last token does: light mode carries no
            // class at all where dark carries exactly `dark`, so keeping an
            // empty `class=""` behind on one side would fail every page.
            return kept === "" ? "" : ` class="${kept}"`;
          })}>`,
    )
    .replace(/<button\b[^>]*\bVPSwitchAppearance\b[^>]*>/g, (button) =>
      button.replace(/\s(?:title|aria-checked)(?:="[^"]*")?/g, ""),
    );
}

/**
 * The dark repaint predicate the pre-load dark pass waits on: VitePress's
 * inline script has applied `.dark` and the repaint has landed, so the sweep
 * reads computed colours that no longer carry the light theme.
 */
const darkRepaintLanded = () => {
  const bodyBg = getComputedStyle(document.body).backgroundColor;
  // Dark backgrounds have very low RGB values.
  const match = /rgba?\((\d+),/.exec(bodyBg);
  return match && Number(match[1]) < 50;
};

/**
 * Reach dark on the already-loaded light page, asserting the reuse premise on
 * the way. The production dark pass re-navigates with the theme pinned before
 * first paint; the collapsed pass instead flips VitePress's own toggle, the
 * reactive path a real user takes, and the only one that does not pay a second
 * navigation.
 *
 * The toggle flipped is the navbar copy — the only one reachable without
 * opening the mobile sidebar. VitePress hides it below 1280px, so the mobile
 * profile projects (390px devices) take the fallback instead: the sidebar's
 * copy sits in the closed VPSidebar, whose `opacity: 0` + `translateX(-100%)`
 * leaves a bounding box Playwright's visible-filter would wrongly accept, and
 * clicking into that off-canvas box would only time out. The fallback is the
 * second navigation this mode exists to remove, paid only where the toggle
 * cannot be reached; the caller's dark assertions are identical either way.
 */
export async function reachDark(browserPage: Page, target: string, label: string): Promise<void> {
  const toggle = browserPage.locator(".VPNavBarAppearance .VPSwitchAppearance").first();
  if (!(await toggle.isVisible())) {
    // The same pre-load dark transport the un-collapsed specs use: pin the
    // theme before navigation so VitePress's inline script paints `.dark`
    // before first paint, then wait for the repaint.
    await browserPage.addInitScript(() => {
      localStorage.setItem("vitepress-theme-appearance", "dark");
    });
    await browserPage.goto(target);
    await browserPage.waitForFunction(darkRepaintLanded);
    return;
  }

  // The toggle's click handler is a hydration artifact, and the light repaint
  // predicate proves nothing about hydration — VitePress's inline script
  // paints before Vue mounts. A click issued before hydration lands is a
  // silent no-op that would surface only as a repaint timeout, so wait for
  // Layout.vue's watchEffect to have run: `data-theme` on the html element is
  // Loom's own hydration marker, written by the same reactive flush that
  // binds the toggle.
  await browserPage.waitForFunction(() => document.documentElement.hasAttribute("data-theme"));

  const before = await browserPage.content();
  await toggle.click();
  await browserPage.waitForFunction(darkRepaintLanded);

  // Continuous enforcement of the measured premise. The collapsed dark pass
  // re-runs only color-dependent checks against the DOM the light pass
  // proved; if the toggle changed anything beyond the three markers, that
  // proof no longer transfers and the dark verdicts would be green against
  // input nobody verified.
  const after = await browserPage.content();
  expect(
    withoutThemeMarkers(after),
    `[dark] ${label}: the theme-reuse premise broke — the page's DOM is not byte-identical across the appearance toggle once the three known markers are normalized (html data-theme, html .dark class, toggle title/aria-checked). The dark pass only re-checks colour on the premise that the light pass proved this exact DOM; find what changed before trusting its verdicts.`,
  ).toEqual(withoutThemeMarkers(before));
}
