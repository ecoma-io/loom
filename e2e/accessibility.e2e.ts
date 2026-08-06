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
for (const page of documentationPages()) {
  const label = page === "." ? "/" : `/${page}`;

  test(`${label} has no violations against Loom's WCAG tag set`, async ({ page: browserPage }) => {
    await browserPage.goto(page);

    const { violations } = await new AxeBuilder({ page: browserPage })
      .withTags([...WCAG_TAGS])
      // One exclude, scoped to `.vp-doc` — the theme's own prose wrapper — so a
      // Loom primitive rendered outside that wrapper still gets checked.
      //
      // `scrollable-region-focusable` on markdown tables: VitePress's default
      // theme makes `.vp-doc table` horizontally scrollable via CSS without
      // giving the table itself a tabindex, so axe flags it as a scrollable
      // region a keyboard user cannot focus. This is the theme's own table
      // styling, not a Loom `Table` primitive — Loom has none.
      //
      // Code blocks were excluded here too, for `color-contrast`. They are not
      // any more, and the reason is worth keeping: the failing colours were
      // Shiki's, but what pushed them under 4.5:1 was our own
      // `--vp-code-block-bg` mapping. Measuring the palette against the
      // background rather than assuming the vendor owned both turned a
      // permanent exclusion into a two-line fix in `theme.css` and
      // `config.mts`. An exclusion whose cause is a line we wrote is not a
      // vendor defect, it is a defect with a note attached.
      .exclude(".vp-doc table")
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
