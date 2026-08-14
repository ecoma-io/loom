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
    await browserPage.goto(page);
    // Sync both theme mechanisms: VitePress's `.dark` class and Loom's
    // `data-theme` attribute. In production, Layout.vue keeps them in sync;
    // the test must reproduce the same consistent state.
    await browserPage.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
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

  test(`${label} (dark) has no violations against Loom's WCAG tag set`, async ({
    page: browserPage,
  }) => {
    await browserPage.goto(page);
    // Sync both theme mechanisms: VitePress's `.dark` class and Loom's
    // `data-theme` attribute. In production, Layout.vue keeps them in sync;
    // the test must reproduce the same consistent state. Setting only
    // `data-theme` without `.dark` leaves VitePress's own CSS in light mode,
    // producing a state no user ever sees — and one where VitePress's
    // light-mode chrome on Loom's dark tokens fails contrast at every turn.
    await browserPage.evaluate(() => {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    });

    const { violations } = await new AxeBuilder({ page: browserPage })
      .withTags([...WCAG_TAGS])
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
