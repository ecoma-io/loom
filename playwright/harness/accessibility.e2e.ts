import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { BROWSER_REQUIRED_RULES } from "@ecoma-io/loom/a11y";
import type { Page } from "@playwright/test";

/**
 * The component harness's accessibility gate.
 *
 * The root cross-cutting suite (`e2e/accessibility.e2e.ts`) sweeps every page
 * of the built docs site with axe, scoped to `WCAG_TAGS` and carrying no
 * excludes. It runs when a docs, theme or infrastructure change reaches PR CI;
 * a component change that owns a harness task runs only the affected components'
 * specs through the harness, and the *whole site* is the wrong object there —
 * it would be exactly the repository-wide sweep the affected model exists to
 * avoid. This spec closes the gap: given the changed components' demo names
 * (`HARNESS_DEMOS`, set by the e2e matrix's harness legs), it mounts each demo
 * through the same harness and holds it to the rendering-dependent half of
 * `WCAG_TAGS` — the 13 rules that require layout geometry, hit-testing,
 * pseudo-element styles, computed colors, canvas, iframe content, or media state.
 *
 * The semantic half of the old gate (50 rules) now runs browserlessly in
 * `docs/demos-a11y.test.ts`, which sweeps the same demos in jsdom with the
 * `BROWSERLESS_RULES` allowlist. That tier is affected-scoped via moon's
 * `button → loom → docs` closure, so every component edit re-runs the demo
 * sweep fresh (replaying from cache otherwise). This gate keeps exactly the
 * rendering-dependent complement; the split is pinned by
 * `packages/core/tests/a11y-scope.test.ts`, which asserts that
 * `BROWSERLESS_RULES ∪ BROWSER_REQUIRED_RULES ∪ TAGGED_BUT_DISABLED_RULES`
 * equals exactly the rule set `WCAG_TAGS` selects in axe-core 4.12.1.
 *
 * `BROWSER_REQUIRED_RULES` is imported rather than restated, so this gate and
 * the browserless gate and the root gate can never drift apart — the same
 * partition by construction, the reason the lists are literals in none of them.
 */

/**
 * The demos this run must sweep, as `?component=<kebab>` names.
 *
 * Two sources, two paths:
 * - `HARNESS_DEMOS` — comma-separated, passed by the CI e2e matrix's harness
 *   legs (they fix `matrix.demos`, the same kebab names that scope the leg's
 *   specs), so one CI leg sweeps every changed component's demo.
 * - `MOON_PROJECT_ID` — the single demo a moon `:e2e --affected` run mounts:
 *   the task command passes this project's own e2e dir and the gate needs the
 *   matching demo, so it derives from the project id, which is the kebab
 *   source basename for every e2e-tagged project (button → button, alert-dialog
 *   → alert-dialog).
 *
 * Both cannot be absent while this spec is collected: CI harness legs always
 * set the env, and the moon task's args always include this file. Splitting is
 * handled by the caller (matrix `join` / moon env), and the fallback is empty
 * so a bare `playwright test --config .../harness` run is a no-op rather than
 * a failure.
 */
const demos = (process.env.HARNESS_DEMOS ?? process.env.MOON_PROJECT_ID ?? "")
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean);

async function scan(page: Page, demo: string, theme: "light" | "dark"): Promise<string[]> {
  // The harness entry reads `localStorage.theme`? No — it does not subscribe to
  // a theme toggle the way VitePress does. Loom's tokens react to a
  // `data-theme` attribute on the root element (`packages/theme-core/src/
  // global.css`), so driving that attribute is the honest mirror of a real
  // theme switch.
  //
  // The attribute is set *after* navigation, not via `addInitScript`: Vite's
  // dev server rewrites the document on load, so a pre-navigation script's
  // attribute is gone before the demo mounts. Setting it post-navigation — and
  // waiting for the repaint channel below — reproduces the state a host
  // mounting Loom in dark mode would actually compute.
  // The harness mounts exactly one demo per page, selected by
  // `?component=<kebab>` (see playwright/harness/main.ts) — that is what makes
  // one component's demo its own browser evidence. A miss throws, so a bad
  // `demos` entry fails loudly here rather than scanning the wrong element.
  await page.goto(`/?component=${demo}`);
  await page.evaluate((value) => {
    document.documentElement.setAttribute("data-theme", value);
  }, theme);
  // The demo must actually mount before axe reads it. The `#app` harness entry
  // renders once the eager-load resolves; wait for a real element rather than
  // a frame, because Firefox is the engine where a timing race reads as "clean".
  await page.locator("#app > *").first().waitFor();
  // And the theme's repaint must have landed before axe reads computed
  // colours. This is the same channel-based check the root gate uses: `html`
  // hardcodes `color-scheme: light dark` in `global.css`, so that property
  // cannot tell the themes apart — the background token can. Light's
  // `--color-background` is `hsl(213 25% 96%)` and dark's is `hsl(213 25% 10%)`
  // (theme.css), red channel >200 in light and <50 in dark.
  await page.waitForFunction((theme) => {
    const match = /rgba?\((\d+),/.exec(getComputedStyle(document.body).backgroundColor);
    if (!match) return false;
    const red = Number(match[1]);
    return theme === "dark" ? red < 50 : red > 200;
  }, theme);

  const { violations } = await new AxeBuilder({ page })
    .withRules([...(BROWSER_REQUIRED_RULES as readonly string[])] as string[])
    // No excludes, and keeping it that way is the point — the same rule holds
    // here as at the root gate: an exclusion is not justified by naming a
    // cause, only by that cause being outside this repository's reach. The
    // demo is this repository's own markup; find the code that emits the
    // failing element rather than silencing it.
    .analyze();

  return violations.map(
    (violation) =>
      `[${violation.impact ?? "unknown"}] ${violation.id}: ${violation.help} (${violation.nodes
        .map((node) => node.target.join(" "))
        .join(", ")})`,
  );
}

for (const demo of demos) {
  test(`${demo} demo has no violations against the rendering-dependent WCAG rules (light)`, async ({
    page,
  }) => {
    const report = await scan(page, demo, "light");
    expect(report, report.join("\n")).toEqual([]);
  });

  test(`${demo} demo has no violations against the rendering-dependent WCAG rules (dark)`, async ({
    page,
  }) => {
    const report = await scan(page, demo, "dark");
    expect(report, report.join("\n")).toEqual([]);
  });
}
