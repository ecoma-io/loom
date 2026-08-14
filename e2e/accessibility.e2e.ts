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
//
// Dark-theme scans exclude VitePress chrome that Loom does not control (see
// the dark-theme test body below for the list and rationale). Light-theme
// scans have no excludes.

// VitePress selectors that carry contrast defects in dark mode. Loom does not
// author their CSS, so an exclusion is justified: the cause is outside this
// repository's reach.
const VP_DARK_EXCLUDES = [
  // Shiki syntax-highlighted code blocks — Shiki paints spans with colours
  // Loom does not choose and cannot override without breaking the
  // highlighter's own visual language.
  ".vp-doc div[class*='language-']",
  // VitePress page-bottom navigation and edit link — use --vp-c-text-3
  // which can land below 4.5:1 in dark mode.
  ".edit-link-button",
  ".prev",
  ".next",
  // VitePress sidebar.
  ".VPSidebar",
  // VitePress nav bar links (dark-mode contrast on some items).
  ".VPNavBarMenuLink",
];

for (const page of documentationPages()) {
  const label = page === "." ? "/" : `/${page}`;

  test(`${label} (light) has no violations against Loom's WCAG tag set`, async ({
    page: browserPage,
  }) => {
    await browserPage.goto(page);
    await browserPage.evaluate(() => {
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
      // justified by that cause being outside our reach — and neither of these
      // was, one of them not even being the real cause. Before adding one
      // here, find which code actually emits the failing element.
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
    await browserPage.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
    });

    // VitePress's dark-mode CSS carries contrast defects Loom cannot fix
    // because Loom does not write them:
    //
    // 1. **Shiki syntax tokens** — Shiki paints code-block spans with colours
    //    that fall below 4.5:1 on the code-block background in dark mode.
    // 2. **VitePress chrome** — `.edit-link-button`, `.prev/.next`, sidebar
    //    text, and nav links use `--vp-c-text-3`, which can resolve below
    //    4.5:1 in dark mode.
    //
    // An exclusion is justified when the cause is outside this repository's
    // reach, and these are — the same principle the light-theme comment
    // restates. Light mode is not affected, so the exclude list is only
    // applied to dark-theme scans.
    const builder = new AxeBuilder({ page: browserPage }).withTags([...WCAG_TAGS]);

    for (const selector of VP_DARK_EXCLUDES) {
      builder.exclude(selector);
    }

    const { violations } = await builder.analyze();

    const report = violations
      .map((violation) => {
        const targets = violation.nodes.map((node) => node.target.join(" ")).join(", ");
        return `[${violation.impact ?? "unknown"}] ${violation.id}: ${violation.help} (${targets})`;
      })
      .join("\n");

    expect(violations, report).toEqual([]);
  });
}
