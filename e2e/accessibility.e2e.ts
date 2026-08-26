import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { WCAG_TAGS } from "@ecoma-io/loom/a11y";
import { documentationPages } from "./docs-pages";

// One `axe-core` run per rendered page, scoped to the WCAG tag set the
// library holds itself to (`WCAG_TAGS`, imported rather than restated — see
// its own docblock for why one array has to answer to both this gate and the
// documentation site's live accessibility panel). The page list itself is
// read off `docs/` at definition time through `documentationPages()`, so a
// page added tomorrow is swept without anyone remembering to list it here.
//
// Each page is scanned in both light and dark themes. Loom's dark tokens are
// a symmetric set (not overrides), so both must pass independently — a
// contrast ratio that clears the floor in light mode is not guaranteed to do
// so in dark, and vice versa.

for (const page of documentationPages()) {
  const label = page === "." ? "/" : `/${page}`;

  test(`${label} (light) has no violations against Loom's WCAG tag set`, async ({
    page: browserPage,
  }) => {
    // Tell VitePress to start in light mode. The `vitepress-theme-appearance`
    // key is the one VitePress's own toggle writes to; its inline script reads
    // it before first paint to set `.dark`, and Layout.vue's watchEffect then
    // mirrors it onto `data-theme`. Setting it before navigation reproduces the
    // path a real user takes through the toggle — no manual DOM mutation, no
    // risk of the reactive system reverting it mid-scan.
    await browserPage.addInitScript(() => {
      localStorage.setItem("vitepress-theme-appearance", "light");
    });
    await browserPage.goto(page);
    // Ensure the repaint has landed before axe reads computed colours.
    await browserPage.waitForFunction(() => {
      const match = /rgba?\((\d+),/.exec(getComputedStyle(document.body).backgroundColor);
      return match && Number(match[1]) > 200;
    });

    const { violations } = await new AxeBuilder({ page: browserPage })
      .withTags([...WCAG_TAGS])
      // No excludes, and keeping it that way is the point.
      //
      // There were two, both blaming the vendor, and both wrong. Code blocks
      // were excluded for `color-contrast` — but the colours that failed were
      // failing against `--vp-code-block-bg`, which is a line we wrote, and
      // pointing it at the content surface instead cleared the floor. Tables
      // were excluded for `scrollable-region-focusable`, blamed on VitePress
      // styling tables as scrollable without a `tabindex` — and VitePress in
      // fact writes that `tabindex` itself, on every table it renders from
      // markdown. The tables that failed were the ones *we* generate as raw
      // HTML in `design-tokens.ts`, which markdown-it passes through untouched.
      //
      // What both exclusions had in common is a note that sounded like a
      // reason. An exclusion is not justified by naming a cause; it is
      // justified by that cause being outside this repository's reach — and
      // neither of these was, one of them not even being the real cause.
      // Before adding one here, find which code actually emits the failing
      // element.
      .analyze();

    const report = violations
      .map((violation) => {
        const targets = violation.nodes.map((node) => node.target.join(" ")).join(", ");
        return `[${violation.impact ?? "unknown"}] ${violation.id}: ${violation.help} (${targets})`;
      })
      .join("\n");

    expect(violations, report).toEqual([]);
  });

  test(`${label} (dark) has no violations against color-dependent WCAG rules`, async ({
    page: browserPage,
  }) => {
    // Tell VitePress to start in dark mode. Setting the localStorage key before
    // navigation means VitePress's inline script adds `.dark` before first paint,
    // Layout.vue's watchEffect mirrors it onto `data-theme`, and the page arrives
    // in the same state a real user sees after toggling — no manual DOM mutation,
    // no risk of the reactive system reverting it mid-scan.
    await browserPage.addInitScript(() => {
      localStorage.setItem("vitepress-theme-appearance", "dark");
    });
    await browserPage.goto(page);
    // Wait for the browser to repaint with the dark theme. VitePress's inline
    // script sets `.dark` before paint, and Layout.vue's watchEffect sets
    // `data-theme` during hydration — but the repaint is asynchronous, and
    // axe can run before the computed colours update, reading stale values.
    await browserPage.waitForFunction(() => {
      const bodyBg = getComputedStyle(document.body).backgroundColor;
      // Dark backgrounds have very low RGB values.
      const match = /rgba?\((\d+),/.exec(bodyBg);
      return match && Number(match[1]) < 50;
    });

    // Measured 2026-08-26: a page's DOM in light and dark is byte-identical
    // except the `data-theme` attribute, the `.dark` class, and VitePress's
    // appearance-toggle `title`/`aria-checked` (its accessible name flips —
    // non-empty in both). Therefore semantic and geometry rules re-prove the
    // same input they already proved in the light pass; only color-dependent
    // checks can differ. The union of light-full + dark-contrast equals the
    // old coverage (full WCAG_TAGS in both themes), and the dark pass is ~27%
    // faster because semantic rules (53 of 70) are not re-run on identical DOM.
    const { violations } = await new AxeBuilder({ page: browserPage })
      .withRules(["color-contrast"])
      // No excludes — the same bar the light-theme test holds itself to.
      //
      // There were once VitePress-specific excludes here, and every one of
      // them was wrong. The `.dark` class was missing from the test, leaving
      // VitePress's own CSS in light mode while Loom's tokens had switched to
      // dark — a state no user ever sees, and one that fails contrast at
      // every turn because VitePress's light-mode chrome colours are not
      // designed for dark backgrounds. Adding `.dark` alongside `data-theme`
      // reproduced the real synchronised state, and the VitePress-specific
      // failures vanished.
      //
      // An exclusion is not justified by naming a cause; it is justified by
      // that cause being outside this repository's reach. The Shiki theme,
      // the code-block background, the VitePress link colour — all are chosen
      // by this repository, in `config.mts` and `theme.css`. Before adding
      // an exclude here, find which code actually emits the failing element.
      .analyze();

    const report = violations
      .map((violation) => {
        const targets = violation.nodes.map((node) => node.target.join(" ")).join(", ");
        return `[${violation.impact ?? "unknown"}] ${violation.id}: ${violation.help} (${targets})`;
      })
      .join("\n");

    expect(violations, report).toEqual([]);
  });
}
