import { test, expect } from "@playwright/test";
import { documentationPages } from "./docs-pages";
import { timed } from "../playwright/timings";
import { REUSE_THEME, reachDark } from "./theme";
import {
  formatViolations,
  loadInDark,
  loadInLight,
  scanColorContrast,
  scanEffectiveRules,
} from "./checks";

// One `axe-core` run per rendered page, scoped to the effective rule set the
// library holds itself to (`BROWSERLESS_RULES ∪ BROWSER_REQUIRED_RULES`,
// imported rather than restated — see a11y-scope's docblock for why the
// partition has exactly one home). The page list itself is
// read off `docs/` at definition time through `documentationPages()`, so a
// page added tomorrow is swept without anyone remembering to list it here.
//
// Each page is scanned in both light and dark themes. Loom's dark tokens are
// a symmetric set (not overrides), so both must pass independently — a
// contrast ratio that clears the floor in light mode is not guaranteed to do
// so in dark, and vice versa.
//
// Both themes ride one test per page when `LOOM_E2E_REUSE_THEME=1` (see
// e2e/theme.ts): the light pass runs the full effective rule set, the dark
// pass flips VitePress's own toggle on the loaded page and re-runs only the
// color-dependent rules against the DOM the light pass proved. Unset — the
// default — each theme still navigates on its own, with byte-for-byte the
// titles and phases it has always had.
for (const page of documentationPages()) {
  const label = page === "." ? "/" : `/${page}`;

  if (!REUSE_THEME) {
    test(`${label} (light) has no violations against Loom's effective WCAG rule set`, async ({
      page: browserPage,
    }) => {
      await loadInLight(browserPage, page);
      const { violations } = await timed("axe-analyze", () => scanEffectiveRules(browserPage));
      expect(violations, formatViolations(violations)).toEqual([]);
    });

    test(`${label} (dark) has no violations against color-dependent WCAG rules`, async ({
      page: browserPage,
    }) => {
      await loadInDark(browserPage, page);
      const { violations } = await timed("axe-analyze", () => scanColorContrast(browserPage));
      expect(violations, formatViolations(violations)).toEqual([]);
    });

    continue;
  }

  test(`${label} has no WCAG violations in either theme`, async ({ page: browserPage }) => {
    await test.step("light", async () => {
      await loadInLight(browserPage, page);
      const { violations } = await timed("axe-analyze", () => scanEffectiveRules(browserPage));
      expect(violations, `[light] ${formatViolations(violations)}`).toEqual([]);
    });

    await test.step("dark", async () => {
      // The dark pass rides the same loaded page: reach dark through
      // VitePress's own toggle — reachDark also asserts the DOM-identity premise
      // the collapse rests on — then re-run only the color-dependent rules.
      await reachDark(browserPage, page, label);
      const { violations } = await timed("axe-analyze", () => scanColorContrast(browserPage));
      expect(violations, `[dark] ${formatViolations(violations)}`).toEqual([]);
    });
  });
}
