import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { BROWSER_REQUIRED_RULES } from "@ecoma-io/loom/a11y";
import type { Page } from "@playwright/test";
import { waitForAppSettled } from "./settle.ts";
import { templateTargets } from "./template-targets.ts";

/**
 * The template tier's accessibility gate.
 *
 * The component harness (`playwright/harness/accessibility.e2e.ts`) holds each
 * demo to the rendering-dependent half of `WCAG_TAGS`; the root suite sweeps
 * every docs page. Neither ever loads a template — templates are consumer-
 * shaped Vite apps outside both the demo list and `documentationPages()` — so
 * without this spec a template could ship an accessibility defect that the
 * same defect in a demo would fail CI over. A template is copied into real
 * products, which makes it the wrong place for the bar to go quiet.
 *
 * `BROWSER_REQUIRED_RULES` is imported rather than restated, so this gate, the
 * harness gate, the browserless gate and the root gate cannot drift apart —
 * the same rule holds here as everywhere else: an exclusion is not justified
 * by naming a cause, only by that cause being outside this repository's reach.
 * A template is this repository's own markup; find the code that emits the
 * failing element rather than silencing it.
 *
 * The theme switch mirrors the harness gate exactly: `data-theme` is set
 * *after* navigation (Vite's dev server rewrites the document on load, so a
 * pre-navigation attribute is gone before the app mounts), and the repaint is
 * confirmed through the body background's red channel — the one property that
 * can tell the themes apart, since `html` hardcodes `color-scheme: light dark`
 * in `global.css`. Both templates import that stylesheet wholesale, so the
 * token switch lands the same way it does in the harness and on the site.
 */

const targets = templateTargets();

if (targets.length === 0) {
  // The smoke spec owns the no-templates story; a bare run of this config
  // without templates reaches here only when that state regresses, so keep the
  // structural placeholder for symmetry rather than duplicating its skip.
  test("no templates to test", () => {
    // Intentionally empty — the test passes to keep CI green.
  });
} else {
  async function scan(page: Page, url: string, theme: "light" | "dark"): Promise<string[]> {
    await page.goto(url);
    await page.evaluate((value) => {
      document.documentElement.setAttribute("data-theme", value);
    }, theme);
    // The app must actually mount — and stop changing — before axe reads it.
    // Wait for a real element rather than a frame, because Firefox is the
    // engine where a timing race reads as "clean"; the settle wait then
    // covers the loading-skeleton swap, so the scan sees the grid and
    // not the skeleton. A template without a loading state settles on the
    // first equal sample, costing one tick.
    await page.locator("#app > *").first().waitFor();
    await waitForAppSettled(page);
    // And the theme's repaint must have landed before axe reads computed
    // colours. Light's `--color-background` is `hsl(213 25% 96%)` and dark's
    // is `hsl(213 25% 10%)` (theme.css), red channel >200 in light and <50 in
    // dark — the same channel-based check the harness and root gates use.
    await page.waitForFunction((value) => {
      const match = /rgba?\((\d+),/.exec(getComputedStyle(document.body).backgroundColor);
      if (!match) return false;
      const red = Number(match[1]);
      return value === "dark" ? red < 50 : red > 200;
    }, theme);

    const { violations } = await new AxeBuilder({ page })
      .withRules([...(BROWSER_REQUIRED_RULES as readonly string[])] as string[])
      .analyze();

    return violations.map(
      (violation) =>
        `[${violation.impact ?? "unknown"}] ${violation.id}: ${violation.help} (${violation.nodes
          .map((node) => node.target.join(" "))
          .join(", ")})`,
    );
  }

  for (const target of targets) {
    const url = `http://localhost:${String(target.port)}${target.route}`;

    test.describe(target.id, () => {
      test(`renders without violations against the rendering-dependent WCAG rules (light)`, async ({
        page,
      }) => {
        const report = await scan(page, url, "light");
        expect(report, report.join("\n")).toEqual([]);
      });

      test(`renders without violations against the rendering-dependent WCAG rules (dark)`, async ({
        page,
      }) => {
        const report = await scan(page, url, "dark");
        expect(report, report.join("\n")).toEqual([]);
      });
    });
  }
}
