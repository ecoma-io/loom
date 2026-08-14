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

  for (const theme of ["light", "dark"] as const) {
    test(`${label} (${theme}) has no violations against Loom's WCAG tag set`, async ({
      page: browserPage,
    }) => {
      await browserPage.goto(page);

      // Set the theme before scanning. The `data-theme` attribute on `<html>`
      // is Loom's single source of truth for theme resolution.
      await browserPage.evaluate((t) => {
        document.documentElement.setAttribute("data-theme", t);
      }, theme);

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
        // justified by that cause being outside our reach — and neither of these
        // was, one of them not even being the real cause. Before adding one
        // here, find which code actually emits the failing element.
        .analyze();

      // A bare `toEqual([])` tells a reader a run failed and nothing about why.
      // What axe already knows for each violation — which rule, how severe, and
      // which element — is exactly what turns a red gate into a fix, so it goes
      // into the assertion message instead of the terminal history alone.
      const report = violations
        .map((violation) => {
          const targets = violation.nodes.map((node) => node.target.join(" ")).join(", ");
          return `[${violation.impact ?? "unknown"}] ${violation.id}: ${violation.help} (${targets})`;
        })
        .join("\n");

      expect(violations, report).toEqual([]);
    });
  }
}
