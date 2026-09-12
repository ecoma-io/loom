import { appendFileSync } from "node:fs";

import { test, type Page } from "@playwright/test";
import { timed } from "../playwright/timings";
import {
  assertColorContrastResult,
  assertKeyboardResult,
  assertRulesResult,
  assertSweepResult,
  assertTargetSizeResult,
  enterPhoneWidth,
  exitPhoneWidth,
  keyboardTableResults,
  loadInLight,
  measureInPage,
  scanColorContrast,
  scanEffectiveRules,
  sweepInTheme,
  sweepLoadedPage,
} from "./checks";
import { reachDark } from "./theme";

// ─────────────────────────────────────────────────────────────────────────────
// The B2 shared-page bench (ecoma-io/loom#381, draft PR #382): can the root
// sweep's four per-page spec groups — accessibility, contrast, target-size,
// keyboard — share one loaded docs page per page instead of one navigation
// per check, without any check's verdict changing?
//
// This file is a measurement instrument, not a gate. It registers ZERO tests
// unless `LOOM_E2E_B2_VARIANT` names one of:
//
//   off  — the pre-merge production shape (the control side of the #382
//          measurement; e2e/page-sweep.e2e.ts has since replaced it), per
//          page: the a11y light+dark test, the contrast light+dark test
//          (each on its own page, dark reached through VitePress's toggle
//          under the byte-identity premise gate), target-size on a fresh
//          default-theme page, keyboard on a fresh 375px page. Four
//          navigations per page.
//   a    — one test per page: a11y light + contrast light on one loaded light
//          page, one reachDark, the two dark passes. One navigation per page.
//   b    — a + target-size on the same light page before the toggle.
//   c    — b + keyboard's table-focusability check at 375px mid-page, on the
//          light page the earlier checks proved: resize down, verdict,
//          restore the project viewport, then the dark passes. The page ends
//          dark, back at the project viewport.
//
// Production never sets the variable (the unset-means-absent contract of
// LOOM_E2E_TIMINGS), and no ci.yml group names this file, so the production
// sweep is untouched by every byte here.
//
// Every assertion is the production assertion: the checks are imported from
// e2e/checks.ts — the same single-sourced bodies the production specs call —
// so a variant cannot pass on weaker evidence than the gate it is meant to
// replace. When `LOOM_E2E_B2_RESULTS` names a file, every check appends one
// JSONL record — the page's state fingerprint taken before the check, and
// the check's result payload — so the baseline and a variant join on
// page+check and diff: the semantic-equivalence evidence and the
// state-leak evidence in one artifact.
// ─────────────────────────────────────────────────────────────────────────────

// Empty means absent, not "some unknown variant": the dispatch input
// interpolates to the empty string when unset, and `process.env` cannot tell
// that from an unset variable — while the else-arm below must throw on a
// genuinely misspelled variant, it must not throw on the absent one.
const RAW_VARIANT = process.env.LOOM_E2E_B2_VARIANT;
const VARIANT = RAW_VARIANT === "" ? undefined : RAW_VARIANT;

// Eight pages spanning every check-relevant feature: the token-table
// foundations (heaviest tables, the pages the keyboard guard exists for),
// the largest gallery (button), the composite widgets whose exemption paths
// the checks name (date segments, rating steps, disabled opacity), an
// overlay page (dialog), and the biggest data surface (data-grid). The
// baseline run ranks their cost; the fleet projection in perf/ uses the
// measured per-page ratios, never this subset's raw wall.
const BENCH_PAGES = [
  "foundations/colour",
  "foundations/typography",
  "foundations/shape",
  "components/button",
  "components/data-grid",
  "components/date-picker",
  "components/dialog",
  "components/rating",
] as const;

const RESULTS_OUT = process.env.LOOM_E2E_B2_RESULTS;

/** One JSONL line per check: the fingerprint plus the result payload. */
function record(line: {
  page: string;
  variant: string;
  check: string;
  stateBefore: Record<string, unknown>;
  result: Record<string, unknown>;
}): void {
  if (RESULTS_OUT === undefined) return;
  try {
    appendFileSync(RESULTS_OUT, JSON.stringify({ ts: new Date().toISOString(), ...line }) + "\n");
  } catch {
    // Diagnostics must never fail a test that would otherwise pass.
  }
}

/** The state a check starts from — the leak-diff joins on these keys. */
const stateBefore = (browserPage: Page): Promise<Record<string, unknown>> =>
  browserPage.evaluate(() => {
    const ae = document.activeElement;
    const cls = (el: Element): string => {
      const c = el.getAttribute("class") ?? "";
      return c.slice(0, 80);
    };
    const toggle = document.querySelector(".VPSwitchAppearance");
    return {
      url: location.pathname,
      viewport: { w: innerWidth, h: innerHeight },
      dataTheme: document.documentElement.getAttribute("data-theme"),
      darkClass: document.documentElement.classList.contains("dark"),
      toggleState: toggle === null ? "absent" : toggle.getAttribute("aria-checked"),
      scrollY: Math.round(scrollY),
      activeElement: ae === null ? "none" : `${ae.tagName} ${cls(ae)}`,
      bodyClass: document.body.getAttribute("class") ?? "",
      prefetchLinks: document.querySelectorAll('link[rel="prefetch"]').length,
      storageKeys: Object.keys(localStorage).sort().join(","),
    };
  });

/** axe's identity payload: the violations and how many node verdicts passed. */
const axeIdentity = (r: Awaited<ReturnType<typeof scanEffectiveRules>>) => ({
  violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
  passNodes: r.passes.reduce((n, p) => n + p.nodes.length, 0),
});

// ── the check runners ────────────────────────────────────────────────────────
// Each runner is the same three beats: fingerprint the page's state, run the
// production check (imported from checks.ts), record its payload, then assert
// the production verdict. The merged variants chain these runners on one
// loaded page; the "off" baseline inlines the same beats inside tests shaped
// exactly like production's.
type CheckRunner = (p: Page, target: string, variant: string) => Promise<void>;

const assertA11yLight: CheckRunner = async (p, target, variant) => {
  const fp = await stateBefore(p);
  const light = await timed("axe-analyze", () => scanEffectiveRules(p));
  record({
    page: target,
    variant,
    check: "a11y-light",
    stateBefore: fp,
    result: axeIdentity(light),
  });
  assertRulesResult(light, "[light] ");
};

const assertContrastLight: CheckRunner = async (p, target, variant) => {
  const fp = await stateBefore(p);
  const sweep = await sweepLoadedPage(p);
  record({ page: target, variant, check: "contrast-light", stateBefore: fp, result: sweep });
  assertSweepResult(sweep, "[light] ");
};

// Production's target-size pass runs on a fresh default-theme page — light,
// deterministically: Playwright's context default colorScheme is light and
// VitePress resolves auto → matchMedia against it. The shared page is light
// too (loadInLight pins it), so the geometry verdict reads the same theme it
// always has; the records join proves it page by page.
const assertTargetSize: CheckRunner = async (p, target, variant) => {
  const fp = await stateBefore(p);
  const findings = await timed("evaluate", () => p.evaluate(measureInPage));
  record({ page: target, variant, check: "target-size", stateBefore: fp, result: { findings } });
  assertTargetSizeResult(findings, "", 24);
};

// No payload to record — reachDark's byte-identity gate is its own evidence,
// and it stays a phase in the timings JSONL either way.
const darkToggle: CheckRunner = async (p, target, label) => {
  await timed("dark-toggle", () => reachDark(p, target, label));
};

const assertA11yDark: CheckRunner = async (p, target, variant) => {
  const fp = await stateBefore(p);
  const dark = await timed("axe-analyze", () => scanColorContrast(p));
  record({ page: target, variant, check: "a11y-dark", stateBefore: fp, result: axeIdentity(dark) });
  assertColorContrastResult(dark, "[dark] ");
};

const assertContrastDark: CheckRunner = async (p, target, variant) => {
  const fp = await stateBefore(p);
  const sweep = await sweepLoadedPage(p);
  record({ page: target, variant, check: "contrast-dark", stateBefore: fp, result: sweep });
  assertSweepResult(sweep, "[dark] ");
};

// The mid-page keyboard leg of variant c, shaped exactly like production's:
// down to 375×800 on the light page the earlier checks proved, verdict, back
// to the project viewport before darkToggle — the viewport reachDark keys on
// (the desktop navbar toggle lives at ≥1280px; below it, the mobile fallback
// navigation). Against the off baseline's fresh native-375 light page, the
// theme now matches too, so the only delta the record join can find is the
// resize-vs-initial-load path.
const assertKeyboard375: CheckRunner = async (p, target, variant) => {
  const saved = await enterPhoneWidth(p);
  const fp = await stateBefore(p);
  const results = await keyboardTableResults(p);
  const unreachable = results.filter((r) => !r.focused).map((r) => `table[${String(r.index)}]`);
  record({
    page: target,
    variant,
    check: "keyboard",
    stateBefore: fp,
    result: { results, unreachable },
  });
  assertKeyboardResult(unreachable, "");
  await exitPhoneWidth(p, saved);
};

// The variant → check-sequence map. b extends a; c extends b. Each runner's
// own name — assertA11yLight, assertContrastDark, … — is the test.step title.
const VARIANT_CHECKS: Record<"a" | "b" | "c", CheckRunner[]> = {
  a: [assertA11yLight, assertContrastLight, darkToggle, assertA11yDark, assertContrastDark],
  b: [
    assertA11yLight,
    assertContrastLight,
    assertTargetSize,
    darkToggle,
    assertA11yDark,
    assertContrastDark,
  ],
  c: [
    assertA11yLight,
    assertContrastLight,
    assertTargetSize,
    assertKeyboard375,
    darkToggle,
    assertA11yDark,
    assertContrastDark,
  ],
};

// The merged variants chain their runners through this wrapper — named for
// what it carries, because expect-expect judges the callee it can see, and a
// bare loop variable is not that. The variant's own test bodies name it.
const assertSharedPage = async (
  p: Page,
  target: string,
  variant: string,
  checks: CheckRunner[],
): Promise<void> => {
  for (const check of checks) {
    await test.step(check.name, () => check(p, target, variant));
  }
};

// ── registration ─────────────────────────────────────────────────────────────
// Off inlines its four production-shaped tests per page; the merged variants
// chain the runners through test.step. Every body is straight-line: the
// variant is chosen before any test registers, so no test body contains a
// conditional that could skip a verdict.
if (VARIANT === undefined) {
  // Production shape: register nothing — unset means absent, untouched gate.
} else if (VARIANT === "off") {
  for (const target of BENCH_PAGES) {
    const label = `/${target}`;

    test(`${label} [b2:off] a11y light+dark`, async ({ page: p }) => {
      await loadInLight(p, target);
      await assertA11yLight(p, target, "off");
      await darkToggle(p, target, label);
      await assertA11yDark(p, target, "off");
    });

    test(`${label} [b2:off] contrast light+dark`, async ({ page: p }) => {
      // Production-exact: sweepInTheme is the reuse mode's light pass (pin,
      // navigate, sweep, no repaint wait). The fingerprint is taken after the
      // sweep returns — the sweep is read-only, so the leak-relevant keys are
      // the state the sweep started from.
      const sweep = await sweepInTheme(p, target, "light");
      record({
        page: target,
        variant: "off",
        check: "contrast-light",
        stateBefore: await stateBefore(p),
        result: sweep,
      });
      assertSweepResult(sweep, "[light] ");
      await darkToggle(p, target, label);
      await assertContrastDark(p, target, "off");
    });

    test(`${label} [b2:off] target-size`, async ({ page: p }) => {
      await timed("goto", () => p.goto(target));
      await assertTargetSize(p, target, "off");
    });

    // Production-exact order: resize first, then navigate — the fresh page
    // never sees a 1280px layout, so it cannot share variant c's
    // resize-after-load path even in principle.
    test(`${label} [b2:off] keyboard@375`, async ({ page: p }) => {
      await p.setViewportSize({ width: 375, height: 800 });
      await timed("goto", () => p.goto(target));
      const fp = await stateBefore(p);
      const results = await keyboardTableResults(p);
      const unreachable = results.filter((r) => !r.focused).map((r) => `table[${String(r.index)}]`);
      record({
        page: target,
        variant: "off",
        check: "keyboard",
        stateBefore: fp,
        result: { results, unreachable },
      });
      assertKeyboardResult(unreachable, "");
    });
  }
} else if (VARIANT === "a" || VARIANT === "b" || VARIANT === "c") {
  const checks = VARIANT_CHECKS[VARIANT];
  for (const target of BENCH_PAGES) {
    const label = `/${target}`;

    // One merged test per page, shaped like production's reuse-mode contrast
    // test: test.step names each check in the report without paying a
    // navigation for it.
    test(`${label} [b2:${VARIANT}] shared page`, async ({ page: p }) => {
      await loadInLight(p, target);
      await assertSharedPage(p, target, VARIANT, checks);
    });
  }
} else {
  throw new Error(
    `LOOM_E2E_B2_VARIANT="${VARIANT}" is not one of off/a/b/c — refusing to run a variant this file cannot name.`,
  );
}
