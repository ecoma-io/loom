/**
 * The capability probe a future lightweight engine must pass before any of
 * Loom's class-B E2E checks can be reconsidered for it.
 *
 * The 2026-09-11 Lightpanda PoC (perf/e2e-browser-authority-matrix.md §4) was
 * an ad-hoc script, and its conclusion is the reason this tool exists: the
 * engine mounted Vue and reported DOM-truthful content but fetched no
 * stylesheet cascade, performed no layout, and crashed the page target on axe
 * injection — so it is not a candidate for any current E2E class. The PoC also
 * produced no artifact a future version could be re-tested against. This probe
 * is that artifact: it mechanizes the measurement so the question "did the
 * engine get better?" is a documented command rather than a script rewrite.
 *
 * What it does: connect to ANY CDP endpoint (`--cdp`, Lightpanda today, any
 * future lightweight engine tomorrow), drive the served docs site over plain
 * HTTP (`--base` — the caller serves `vitepress preview` themselves), run the
 * capability cases, and emit one JSON report on stdout. Deliberately
 * engine-agnostic: nothing here names a vendor. The report's `verdict` names
 * the capability classes the engine may host, derived fail-closed from the
 * case verdicts:
 *
 *   dom .................. the app mounts and reports DOM truth
 *   dom+hit-testing ...... aria-hidden-focus, bypass (elementsFromPoint)
 *   cascade+layout ....... class B — the 12 rules that need exactly a working
 *                          stylesheet cascade and flex/media layout
 *   axe .................. axe-core runs against a live page at all
 *
 * Nothing ever grants "full browser". The 3 rules that need canvas, iframe
 * load or media state (label-content-name-mismatch, frame-focusable-content,
 * no-autoplay-audio) are vacuous on the built site today and only a real
 * browser proves them; the probe reports them as browser-only no matter what
 * the cases say.
 *
 * Fail-closed semantics, end to end. A case's `run` throwing is ERROR (the
 * engine could not be measured — the PoC's axe crash is the canonical case),
 * never a crash of the probe. A case that measures and contradicts the
 * chromium reference is FAIL. A case that measures and satisfies only part of
 * its capability is DEGRADED — which never grants its class. The exit code is
 * 0 only when every case passed, unless `--report-only`. The axe rule lists
 * are hardcoded because the tooling layer's boundary row forbids importing the
 * library it checks (`onlyDependOnLibsWithTags: []` beyond e2e/docs); the
 * source of truth stays packages/core/src/a11y-scope.ts, and
 * browser-capability-probe.test.ts pins these lists against that file's source
 * text so the two cannot drift.
 *
 * Scope, deliberately: this is a MEASUREMENT tool, not a gate. No production
 * workflow routes through it, and no engine failing this contract hosts
 * anything (the acceleration model, perf/e2e-acceleration-model.md, keeps the
 * shipped gates on real browsers regardless). It exists so the next candidate
 * engine can be judged in minutes, with evidence, instead of by PoC.
 *
 * Run `--help` for the exact recipe, `--self-test` to exercise the probe's own
 * logic without any engine (CI and lint can run something meaningful here).
 * Like e2e-plan.ts, the pure logic is exported so the vitest tier can hold it
 * without a network or a browser.
 */
import { strict as assert } from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";

import type { Page } from "@playwright/test";

// Repo root (the script lives in `tools/`), for the axe-core injection source.
const ROOT = new URL("..", import.meta.url).pathname;

// ---- the defaults the recipe in --help promises ------------------------------

const DEFAULT_CDP = "ws://127.0.0.1:9222";
// `vitepress preview` binds 4173 and serves under the site's base path
// (docs/.vitepress/base.ts), the same two facts playwright.config.ts names once
// as PREVIEW_PORT and BASE_URL — a `--base` without the path prefix lands every
// goto on the 404 that a request for `/` produces under a non-root base.
const DEFAULT_BASE = "http://localhost:4173/docs/contribute/design-system/";
const DEFAULT_ENGINE = "unlabeled";
const NAV_TIMEOUT_MS = 30_000;
const RESIZE_TIMEOUT_MS = 5_000;
const DEFAULT_CASE_TIMEOUT_MS = 60_000;

// The pages the cases drive. The button page because it carries a real Loom
// component in every case's needed form (tokens, computed styles, a target for
// geometry and hit-testing), app-shell because flex/media layout is the
// question there (the same page layout-responsive.e2e.ts drives).
const BUTTON_PAGE = "components/button";
const APP_SHELL_PAGE = "layouts/app-shell";

// ---- chromium-reference baselines --------------------------------------------
//
// The probe fails closed against these, so each one records how it was
// obtained — an unmeasured number here would be a fabricated one.

/**
 * The token-driven body background of the built site in the light theme:
 * `rgb(242, 245, 247)` — measured on the PoC's chromium control group
 * (perf/e2e-browser-authority-matrix.md §4, 2026-09-11), and derivable from
 * the token source: `--color-background: hsl(213 25% 96%)`
 * (packages/theme-core/src/theme.css), applied to `body` by global.css,
 * computes to exactly these channels.
 */
const LIGHT_BODY_BG = "rgb(242, 245, 247)";

/** The authored `--color-background` value the cascade case expects to read
 * back out of the CSSOM. Compared through `sameColor` so an engine that
 * serializes `hsl(213, 25%, 96%)` or `rgb(242, 245, 247)` still passes — the
 * claim is "this token is in the cascade", not "this engine rounds like
 * Chromium". */
const TOKEN_BACKGROUND_AUTHORED = "hsl(213 25% 96%)";

/** The red-channel thresholds the shipped suite already uses to prove which
 * theme painted (e2e/accessibility.e2e.ts's wait-repaint predicates): the
 * light `--color-background` computes with red ≥ 200, the dark
 * `hsl(213 25% 10%)` with red < 50. Reused, not re-derived. */
const LIGHT_BODY_RED_MIN = 200;
const DARK_BODY_RED_MAX = 50;

/**
 * A primary Loom Button resolves to `display: inline-flex` and white text —
 * read from the component source (worktree head 19fd90d at authoring time,
 * 2026-09-11), not from a browser: `buttonVariants` puts `inline-flex` and
 * `text-primary-foreground` on every primary button, and
 * `--color-primary-foreground` is `hsl(0 0% 100%)`. The font-family string is
 * engine-serialized and is asserted as a property (non-empty), never spelled.
 */
const BUTTON_DISPLAY = "inline-flex";
const BUTTON_COLOR = "rgb(255, 255, 255)";

/**
 * The button count of the button page's FIRST demo figure ("Variants"): six
 * `<Button>` usages, counted in docs/components/button.md's first `<Demo>`
 * block. The PoC also recorded a page-wide count (36 buttons) — that total
 * moves with every page-chrome or demo edit, so the probe pins the
 * source-countable figure and reports the page-wide number in the case detail
 * for comparison against the PoC.
 */
const FIRST_FIGURE_BUTTON_COUNT = 6;
const BUTTON_PAGE_TITLE = "Button";
const BUTTON_PAGE_H1 = "Button";

/** VitePress's own sidebar breakpoint, so the media-query flip exercises a
 * query the built site actually ships. The two viewports straddle it the same
 * way layout-responsive.e2e.ts's bands do. */
const MEDIA_QUERY = "(min-width: 960px)";
const MEDIA_WIDE_VIEWPORT = { width: 1024, height: 800 };
const MEDIA_NARROW_VIEWPORT = { width: 360, height: 800 };

// ---- the axe rule partition this probe exists to answer -----------------------
//
// Source of truth: BROWSER_REQUIRED_RULES in packages/core/src/a11y-scope.ts
// (17 rules). The lists are restated here because the tooling layer's boundary
// row (`onlyDependOnLibsWithTags: []` beyond e2e/docs) forbids a tools file
// from importing the library it measures — the same reason
// check-a11y-evidence.ts PARSES the contract instead of importing it. The
// drift this could cause is pinned shut by browser-capability-probe.test.ts,
// which extracts BROWSER_REQUIRED_RULES from that file's source text and
// asserts equality with AXE_PROBE_RULES below.

/** The 12 rules that need exactly cascade+layout — what hosting "class B"
 * means (perf/e2e-browser-authority-matrix.md §1 and the sub-partition noted
 * there). */
export const CASCADE_LAYOUT_RULES = [
  "color-contrast",
  "avoid-inline-spacing",
  "link-in-text-block",
  "scrollable-region-focusable",
  "target-size",
  "marquee",
  "object-alt",
  "td-headers-attr",
  "th-has-data-cells",
  "table-fake-caption",
  "td-has-header",
  "p-as-heading",
] as const;

/** The 2 rules that need DOM truth plus a hit-testing fallback only —
 * elementsFromPoint on the modal-open path. */
export const DOM_HIT_TEST_RULES = ["aria-hidden-focus", "bypass"] as const;

/** The 3 rules no probe case can prove: canvas, iframe load, media currentSrc.
 * Vacuous on the built site today, and always full-browser-only. */
export const FULL_BROWSER_RULES = [
  "label-content-name-mismatch",
  "frame-focusable-content",
  "no-autoplay-audio",
] as const;

/** What `axe-injection` runs: the whole 17-rule browser-required set, so one
 * pass answers "can this engine host the browser axe gate's rule list at
 * all". */
export const AXE_PROBE_RULES: readonly string[] = [
  ...CASCADE_LAYOUT_RULES,
  ...DOM_HIT_TEST_RULES,
  ...FULL_BROWSER_RULES,
];

// ---- types --------------------------------------------------------------------

export type CaseVerdict = "PASS" | "FAIL" | "DEGRADED" | "ERROR";

export type Capability =
  "dom" | "cascade" | "layout" | "hit-testing" | "axe" | "interaction" | "probe";

export interface CaseResult {
  id: string;
  capability: Capability;
  verdict: CaseVerdict;
  /** What was measured, with the numbers — the diff a future engine version
   * is judged by. */
  detail: string;
}

export interface ProbeReport {
  engine: string;
  baseUrl: string;
  timestamp: string;
  cases: CaseResult[];
  summary: { pass: number; degraded: number; fail: number; error: number; total: number };
  /** The capability classes this engine may host, fail-closed from the cases. */
  hostedClasses: string[];
  verdict: string;
}

export interface ProbeOptions {
  cdp: string;
  base: string;
  engine: string;
  out?: string;
  reportOnly: boolean;
  timeoutMs: number;
}

/** What a case's `run` returns when it MEASURED something; anything thrown
 * becomes ERROR instead. */
export interface CaseRun {
  verdict: "PASS" | "FAIL" | "DEGRADED";
  detail: string;
}

/**
 * The probe's own view of a Playwright page. Type-only: the runner never
 * touches the page itself (the case does), and the vitest tier exercises the
 * runner with a synthetic page object, which is why this is an alias and not
 * a structural re-declaration.
 */
export type CasePage = Page;

/** The runner opens and discards one page per case so no case inherits the
 * previous case's DOM, viewport or localStorage. */
export interface CaseContext {
  openPage(): Promise<CasePage>;
  discardPage(page: CasePage): Promise<void>;
}

export interface CaseDefinition {
  id: string;
  capability: Capability;
  run(page: CasePage): Promise<CaseRun>;
}

// ---- pure report logic ---------------------------------------------------------

export const CASE_CATALOG: readonly { id: string; capability: Capability }[] = [
  { id: "dom-mount", capability: "dom" },
  { id: "css-loading", capability: "cascade" },
  { id: "css-cascade", capability: "cascade" },
  { id: "computed-style", capability: "cascade" },
  { id: "layout-flex", capability: "layout" },
  { id: "geometry", capability: "layout" },
  { id: "media-queries", capability: "layout" },
  { id: "theme-switch", capability: "cascade" },
  { id: "focus", capability: "interaction" },
  { id: "hit-testing", capability: "hit-testing" },
  { id: "axe-injection", capability: "axe" },
];

/** The cases whose PASS together grant "cascade+layout (class B)". `focus` is
 * deliberately absent: it is the focus-not-obscured reroute's evidence, not
 * one of the 12 rules' needs, and it must never silently widen the class. */
/** The conjunctive case set that grants "cascade+layout (class B)" — exported
 * for the vitest tier, which pins its membership against the case catalog. */
export const CLASS_B_GATE = [
  "dom-mount",
  "css-loading",
  "css-cascade",
  "computed-style",
  "theme-switch",
  "layout-flex",
  "geometry",
  "media-queries",
] as const;

export function tally(cases: readonly CaseResult[]): ProbeReport["summary"] {
  const count = (verdict: CaseVerdict): number => cases.filter((c) => c.verdict === verdict).length;
  return {
    pass: count("PASS"),
    degraded: count("DEGRADED"),
    fail: count("FAIL"),
    error: count("ERROR"),
    total: cases.length,
  };
}

/**
 * The capability classes the cases grant — PASS only. DEGRADED and ERROR
 * never grant, which is the whole point of the level: an engine that mounts
 * but cannot paint "mostly works" and still hosts nothing.
 */
export function hostedClasses(cases: readonly CaseResult[]): string[] {
  const verdictOf = new Map(cases.map((c) => [c.id, c.verdict]));
  const passes = (id: string): boolean => verdictOf.get(id) === "PASS";
  const classes: string[] = [];
  if (passes("dom-mount")) classes.push("dom");
  if (passes("dom-mount") && passes("hit-testing")) {
    classes.push(`dom+hit-testing (${DOM_HIT_TEST_RULES.join(", ")})`);
  }
  if (CLASS_B_GATE.every(passes)) {
    classes.push(`cascade+layout (class B: ${String(CASCADE_LAYOUT_RULES.length)} rules)`);
  }
  if (passes("axe-injection")) classes.push("axe");
  return classes;
}

export function verdictText(classes: readonly string[]): string {
  if (classes.length === 0) {
    return "no capability verified — this engine may not host any class of browser-required rule";
  }
  const tail =
    "the 3 canvas/iframe/media rules " +
    `(${FULL_BROWSER_RULES.join(", ")}) always remain full-browser-only`;
  return `${classes.join("; ")} — and nothing more; ${tail}`;
}

export function buildReport(
  engine: string,
  baseUrl: string,
  timestamp: string,
  cases: CaseResult[],
): ProbeReport {
  const classes = hostedClasses(cases);
  return {
    engine,
    baseUrl,
    timestamp,
    cases,
    summary: tally(cases),
    hostedClasses: classes,
    verdict: verdictText(classes),
  };
}

/**
 * Shape check for a decoded report — `[]` means valid. The probe validates
 * its own output nowhere at runtime (a malformed report is a probe bug the
 * self-test and the vitest tier exist to catch), but consumers of `--out`
 * files across engine versions need the contract asserted somewhere honest.
 */
const isNonEmptyString = (value: unknown): boolean => typeof value === "string" && value.length > 0;

export function validateReport(value: unknown): string[] {
  if (typeof value !== "object" || value === null) return ["report is not an object"];
  const report = value as Record<string, unknown>;
  const problems: string[] = [];
  for (const field of ["engine", "baseUrl", "timestamp", "verdict"] as const) {
    if (!isNonEmptyString(report[field])) {
      problems.push(`${field} must be a non-empty string`);
    }
  }
  if (!Array.isArray(report.hostedClasses)) {
    problems.push("hostedClasses must be an array of strings");
  } else if (!report.hostedClasses.every((c) => typeof c === "string")) {
    problems.push("hostedClasses must contain only strings");
  }
  if (!Array.isArray(report.cases)) {
    problems.push("cases must be an array");
    return problems;
  }
  const verdicts: readonly string[] = ["PASS", "FAIL", "DEGRADED", "ERROR"];
  for (const [index, entry] of report.cases.entries()) {
    if (typeof entry !== "object" || entry === null) {
      problems.push(`cases[${String(index)}] is not an object`);
      continue;
    }
    const c = entry as Record<string, unknown>;
    if (!isNonEmptyString(c.id)) {
      problems.push(`cases[${String(index)}].id must be a non-empty string`);
    }
    if (!isNonEmptyString(c.capability)) {
      problems.push(`cases[${String(index)}].capability must be a non-empty string`);
    }
    if (typeof c.verdict !== "string" || !verdicts.includes(c.verdict)) {
      problems.push(`cases[${String(index)}].verdict must be one of ${verdicts.join("|")}`);
    }
    if (!isNonEmptyString(c.detail)) {
      problems.push(`cases[${String(index)}].detail must be a non-empty string`);
    }
  }
  const summary = report.summary;
  if (typeof summary !== "object" || summary === null) {
    problems.push("summary must be an object");
    return problems;
  }
  const expected = tally(report.cases as CaseResult[]);
  const actual = summary as Record<string, unknown>;
  for (const field of ["pass", "degraded", "fail", "error", "total"] as const) {
    if (actual[field] !== expected[field]) {
      problems.push(
        `summary.${field} is ${String(actual[field])}, cases say ${String(expected[field])}`,
      );
    }
  }
  return problems;
}

/** Fail closed: any case that is not PASS holds the exit at 1 — DEGRADED
 * included, because it is a measured deficiency, not a pass. */
export function exitCodeFor(report: ProbeReport, reportOnly: boolean): number {
  if (reportOnly) return 0;
  return report.cases.every((c) => c.verdict === "PASS") ? 0 : 1;
}

// ---- the case runner ------------------------------------------------------------

const describeError = (error: unknown): string =>
  error instanceof Error ? `${error.name}: ${error.message}` : "threw a non-Error value";

/** A rejection this file swallows on purpose: cleanup that fails (closing a
 * page the engine already killed) is not evidence. Named once so the intent
 * lives in a comment instead of two anonymous arrows. */
const noop = (): void => {
  // Intentionally nothing.
};

/**
 * Run one case against one freshly opened page. The mapping this function
 * owns is the probe's fail-closed core: a returned verdict is measured
 * evidence, a throw is ERROR with the message, a stalled engine is ERROR
 * after the watchdog — and the page is discarded either way.
 */
export async function runCase(
  def: CaseDefinition,
  ctx: CaseContext,
  timeoutMs: number,
): Promise<CaseResult> {
  const page = await ctx.openPage();
  // Both race legs are wrapped into never-rejecting promises so a loser that
  // settles after the race (an engine crashing late, a watchdog firing) can
  // never surface as an unhandled rejection and kill the probe.
  type Leg =
    { kind: "value"; run: CaseRun } | { kind: "error"; error: unknown } | { kind: "timeout" };
  const runLeg = def.run(page).then(
    (run): Leg => ({ kind: "value", run }),
    (error: unknown): Leg => ({ kind: "error", error }),
  );
  let watchdog: NodeJS.Timeout | undefined;
  const timeoutLeg = new Promise<Leg>((resolve) => {
    watchdog = setTimeout(() => {
      resolve({ kind: "timeout" });
    }, timeoutMs);
  });
  try {
    const leg = await Promise.race([runLeg, timeoutLeg]);
    if (leg.kind === "timeout") {
      return {
        id: def.id,
        capability: def.capability,
        verdict: "ERROR",
        detail: `no answer within ${String(timeoutMs)}ms — the engine stopped responding to this case`,
      };
    }
    if (leg.kind === "error") {
      return {
        id: def.id,
        capability: def.capability,
        verdict: "ERROR",
        detail: describeError(leg.error),
      };
    }
    return {
      id: def.id,
      capability: def.capability,
      verdict: leg.run.verdict,
      detail: leg.run.detail,
    };
  } finally {
    if (watchdog !== undefined) clearTimeout(watchdog);
    // The discard is awaited inside the finally so a case can never leak a
    // page into the next one; a page that is already gone (the PoC's crash
    // signature) closes as an error and that error is cleanup, not evidence.
    await ctx.discardPage(page).catch(noop);
  }
}

// ---- color helpers ---------------------------------------------------------------
//
// Computed colors are the one value class whose *string* differs across
// engines even when the color is right (rgb vs hsl notation, spacing). The
// cases therefore compare parsed channels.

interface ParsedColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Parse the serializations computed style actually produces — `rgb()`,
 * `rgba()`, `hsl()`, `hsla()`, comma or space separated, `%` where legal —
 * plus the `transparent` keyword. Anything else (empty string, a color
 * function the engine invented, a non-color) is null. */
export function parseColor(value: string): ParsedColor | null {
  const trimmed = value.trim();
  if (trimmed === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
  const match = /^(rgba?|hsla?)\(([^)]*)\)$/.exec(trimmed);
  if (match === null) return null;
  const kind = match[1] ?? "";
  const raw = (match[2] ?? "").split(/[\s,/]+/).filter((token) => token.length > 0);
  if (raw.length < 3 || raw.length > 4) return null;
  // `%` scales against its channel's domain: 0–255 for rgb, 0–1 for hsl
  // saturation/lightness and alpha.
  const scaled = (token: string, domain: number): number | null => {
    const percent = token.endsWith("%");
    const n = Number.parseFloat(token);
    if (Number.isNaN(n)) return null;
    return percent ? (n / 100) * domain : n;
  };
  const h = Number.parseFloat(raw[0] ?? "");
  const second = scaled(raw[1] ?? "", 1);
  const third = scaled(raw[2] ?? "", 1);
  const alphaToken = raw[3];
  const alpha = alphaToken === undefined ? 1 : scaled(alphaToken, 1);
  if (second === null || third === null || alpha === null || Number.isNaN(h)) return null;
  if (kind.startsWith("h")) {
    const [r, g, b] = hslToRgb(((h % 360) + 360) % 360, second, third);
    return { r, g, b, a: alpha };
  }
  const r = scaled(raw[0] ?? "", 255);
  const g = scaled(raw[1] ?? "", 255);
  const b = scaled(raw[2] ?? "", 255);
  if (r === null || g === null || b === null) return null;
  return { r: Math.round(r), g: Math.round(g), b: Math.round(b), a: alpha };
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const segment = Math.floor(hp) % 6;
  const rgb: [number, number, number] =
    segment === 0
      ? [c, x, 0]
      : segment === 1
        ? [x, c, 0]
        : segment === 2
          ? [0, c, x]
          : segment === 3
            ? [0, x, c]
            : segment === 4
              ? [x, 0, c]
              : [c, 0, x];
  const m = l - c / 2;
  return [
    Math.round((rgb[0] + m) * 255),
    Math.round((rgb[1] + m) * 255),
    Math.round((rgb[2] + m) * 255),
  ];
}

/** Same color, compared on parsed channels — the engine-agnostic equality the
 * cascade cases assert with. */
export function sameColor(a: string, b: string): boolean {
  const pa = parseColor(a);
  const pb = parseColor(b);
  if (pa === null || pb === null) return false;
  return pa.r === pb.r && pa.g === pb.g && pa.b === pb.b && Math.abs(pa.a - pb.a) < 0.01;
}

const isPainted = (color: string): boolean => {
  const parsed = parseColor(color);
  return parsed !== null && parsed.a > 0;
};

// ---- page helpers ------------------------------------------------------------------

/** The URL one docs page resolves to under `--base`. `new URL` handles the
 * join, which is why the base is normalized to a trailing slash first. */
export function pageUrl(base: string, path: string): string {
  const withSlash = base.endsWith("/") ? base : `${base}/`;
  return new URL(path, withSlash).toString();
}

/**
 * Navigate and refuse to measure a page that did not arrive. A 404 here is
 * almost always a `--base` without the site's path prefix — the one setup
 * mistake the recipe cannot prevent — so the error names it.
 */
async function gotoPage(page: CasePage, options: ProbeOptions, path: string): Promise<void> {
  const url = pageUrl(options.base, path);
  const response = await page.goto(url, { waitUntil: "load", timeout: NAV_TIMEOUT_MS });
  const status = response === null ? 0 : response.status();
  if (response === null || status >= 400) {
    throw new Error(
      `HTTP ${String(status)} for ${url} — check --base: vitepress preview serves under the site base path (${DEFAULT_BASE})`,
    );
  }
}

/** The DOM-only readiness wait: the demo's components are SSR'd into the built
 * HTML, so their presence needs no style engine — cases that need the cascade
 * prove that separately, and a page that never mounts fails THIS wait rather
 * than hanging the probe. */
async function demoMounted(page: CasePage, path: string): Promise<boolean> {
  return page
    .waitForSelector("figure button", { state: "attached", timeout: NAV_TIMEOUT_MS })
    .then(
      () => true,
      () => false,
    )
    .then((mounted) => {
      if (mounted) return true;
      throw new Error(
        `the ${path} demo never mounted (no figure button within ${String(NAV_TIMEOUT_MS)}ms)`,
      );
    });
}

/** Set the viewport and wait until the engine's layout actually agrees —
 * `setViewportSize` returning is not the same as the new metrics applying on
 * a CDP-attached engine, and a layout case that measured stale metrics would
 * report a defect the engine does not have. */
async function resizeViewport(
  page: CasePage,
  viewport: { width: number; height: number },
): Promise<void> {
  await page.setViewportSize(viewport);
  const landed = await page
    .waitForFunction(
      (expected: number) => document.documentElement.clientWidth === expected,
      viewport.width,
      { timeout: RESIZE_TIMEOUT_MS },
    )
    .then(
      () => true,
      () => false,
    );
  if (!landed) {
    const actual = await page.evaluate(() => document.documentElement.clientWidth);
    throw new Error(
      `viewport emulation did not apply (asked for ${String(viewport.width)}px, clientWidth stayed ${String(actual)})`,
    );
  }
}

// ---- the cases ------------------------------------------------------------------
//
// Order is load-bearing: the cascade cases run before theme-switch (which
// flips the persisted theme and cleans up after itself), and axe — the one
// case that has crashed an engine — runs last.

interface CaseDeps {
  options: ProbeOptions;
  axeSource: () => string;
}

export function buildCases(deps: CaseDeps): CaseDefinition[] {
  const { options } = deps;
  const defs: CaseDefinition[] = [];

  defs.push({
    id: "dom-mount",
    capability: "dom",
    run: async (page) => {
      await gotoPage(page, options, BUTTON_PAGE);
      await demoMounted(page, BUTTON_PAGE);
      const dom = await page.evaluate(() => {
        const figures = document.querySelectorAll("figure");
        // Indexed access, not item(0): the DOM types declare item() as
        // non-nullable, so a null check on it reads as always-false while the
        // list can still be empty.
        const firstFigure = figures[0];
        return {
          title: document.title,
          h1s: Array.from(document.querySelectorAll("h1"), (h) => h.textContent.trim()),
          figureCount: figures.length,
          firstFigureButtons:
            firstFigure === undefined ? 0 : firstFigure.querySelectorAll("button").length,
          pageButtons: document.querySelectorAll("button").length,
        };
      });
      const h1 = dom.h1s.length === 1 ? (dom.h1s[0] ?? "") : `<${String(dom.h1s.length)} h1s>`;
      const chromeMatches =
        dom.title.includes(BUTTON_PAGE_TITLE) && dom.h1s.length === 1 && h1 === BUTTON_PAGE_H1;
      if (dom.firstFigureButtons !== FIRST_FIGURE_BUTTON_COUNT) {
        return {
          verdict: "FAIL",
          detail:
            `first figure holds ${String(dom.firstFigureButtons)} buttons, chromium reference is ${String(FIRST_FIGURE_BUTTON_COUNT)}; ` +
            `page-wide ${String(dom.pageButtons)} buttons (PoC saw 36), ${String(dom.figureCount)} figures, h1 ${h1}, title "${dom.title}"`,
        };
      }
      if (!chromeMatches) {
        return {
          verdict: "DEGRADED",
          detail:
            `the demo mounts with the reference button count but the page chrome differs: h1 ${h1}, title "${dom.title}"; ` +
            `page-wide ${String(dom.pageButtons)} buttons`,
        };
      }
      return {
        verdict: "PASS",
        detail: `title + h1 match, first figure ${String(dom.firstFigureButtons)} buttons, page-wide ${String(dom.pageButtons)}`,
      };
    },
  });

  defs.push({
    id: "css-loading",
    capability: "cascade",
    run: async (page) => {
      await gotoPage(page, options, BUTTON_PAGE);
      await demoMounted(page, BUTTON_PAGE);
      const css = await page.evaluate(() => ({
        sheets: document.styleSheets.length,
        bodyBackground: getComputedStyle(document.body).backgroundColor,
      }));
      const applied = sameColor(css.bodyBackground, LIGHT_BODY_BG);
      if (css.sheets === 0 || !applied) {
        return {
          verdict: "FAIL",
          detail:
            `styleSheets: ${String(css.sheets)}, body background: "${css.bodyBackground}" — ` +
            (css.sheets === 0
              ? "no stylesheet reached the CSSOM (the PoC's styleSheets:0 signature)"
              : `stylesheets present but the token-driven body background is not ${LIGHT_BODY_BG}`),
        };
      }
      return {
        verdict: "PASS",
        detail: `${String(css.sheets)} stylesheets in the CSSOM; body background applied (${LIGHT_BODY_BG})`,
      };
    },
  });

  defs.push({
    id: "css-cascade",
    capability: "cascade",
    run: async (page) => {
      await gotoPage(page, options, BUTTON_PAGE);
      await demoMounted(page, BUTTON_PAGE);
      const cascade = await page.evaluate(() => {
        const button = document.querySelector("figure button");
        return {
          token: getComputedStyle(document.documentElement)
            .getPropertyValue("--color-background")
            .trim(),
          buttonBackground:
            button instanceof HTMLElement ? getComputedStyle(button).backgroundColor : "",
          bodyBackground: getComputedStyle(document.body).backgroundColor,
        };
      });
      const tokenInCascade = sameColor(cascade.token, TOKEN_BACKGROUND_AUTHORED);
      const buttonPainted = isPainted(cascade.buttonBackground);
      const buttonDiffers = !sameColor(cascade.buttonBackground, cascade.bodyBackground);
      if (!tokenInCascade || !buttonPainted || !buttonDiffers) {
        return {
          verdict: "FAIL",
          detail:
            `--color-background reads back "${cascade.token}" (expected ${TOKEN_BACKGROUND_AUTHORED}), ` +
            `primary button background "${cascade.buttonBackground}" vs body "${cascade.bodyBackground}" — ` +
            (!tokenInCascade
              ? "the authored token never reached the CSSOM"
              : !buttonPainted
                ? "the component's computed fill is not a painted color"
                : "the component's fill resolves to the page ground — var() did not resolve through the cascade"),
        };
      }
      return {
        verdict: "PASS",
        detail: `token reads back from the CSSOM and the primary button resolves a painted fill distinct from the body (${cascade.buttonBackground})`,
      };
    },
  });

  defs.push({
    id: "computed-style",
    capability: "cascade",
    run: async (page) => {
      await gotoPage(page, options, BUTTON_PAGE);
      await demoMounted(page, BUTTON_PAGE);
      const computed = await page.evaluate(() => {
        const button = document.querySelector("figure button");
        if (!(button instanceof HTMLElement)) return null;
        const style = getComputedStyle(button);
        return {
          display: style.display,
          opacity: style.opacity,
          color: style.color,
          fontFamily: style.fontFamily,
        };
      });
      if (computed === null) {
        throw new Error(
          "the button page has no figure button — presupposition of every cascade case",
        );
      }
      const displayOk = computed.display === BUTTON_DISPLAY;
      const opacityOk = computed.opacity === "1";
      const colorOk = sameColor(computed.color, BUTTON_COLOR);
      const fontOk =
        computed.fontFamily.trim().length > 0 &&
        computed.fontFamily.trim() !== "initial" &&
        computed.fontFamily.trim() !== "inherit";
      const measured = `display "${computed.display}", opacity "${computed.opacity}", color "${computed.color}", font-family "${computed.fontFamily}"`;
      if (displayOk && opacityOk && colorOk && fontOk) {
        return { verdict: "PASS", detail: `resolved on a primary button: ${measured}` };
      }
      // A partial resolve — some properties come back resolved and others fall
      // to initial values — is exactly the DEGRADED middle: getComputedStyle
      // answers, the cascade behind it is incomplete. It grants no class.
      if (displayOk && opacityOk && (colorOk || fontOk)) {
        return { verdict: "DEGRADED", detail: `partially resolved: ${measured}` };
      }
      return { verdict: "FAIL", detail: `computed style did not resolve: ${measured}` };
    },
  });

  defs.push({
    id: "layout-flex",
    capability: "layout",
    run: async (page) => {
      await gotoPage(page, options, APP_SHELL_PAGE);
      await demoMounted(page, APP_SHELL_PAGE);
      await resizeViewport(page, MEDIA_NARROW_VIEWPORT);
      const narrow = await boxesOf(page);
      await resizeViewport(page, MEDIA_WIDE_VIEWPORT);
      const wide = await boxesOf(page);
      const degenerate = (b: Box | null): boolean => b === null || b.width < 50 || b.height <= 0;
      if (
        degenerate(narrow.sidebar) ||
        degenerate(narrow.content) ||
        degenerate(wide.sidebar) ||
        degenerate(wide.content)
      ) {
        return {
          verdict: "FAIL",
          detail:
            `degenerate boxes — no layout engine: at 360px sidebar ${boxText(narrow.sidebar)}, content ${boxText(narrow.content)}; ` +
            `at 1024px sidebar ${boxText(wide.sidebar)}, content ${boxText(wide.content)}`,
        };
      }
      const stacked =
        narrow.content !== null &&
        narrow.sidebar !== null &&
        narrow.content.y >= narrow.sidebar.y + narrow.sidebar.height - 1;
      const sideBySide =
        wide.content !== null &&
        wide.sidebar !== null &&
        wide.content.x > wide.sidebar.x + wide.sidebar.width - 1;
      if (!stacked || !sideBySide) {
        return {
          verdict: "FAIL",
          detail:
            `flex-wrap does not flip: stacked at 360px is ${String(stacked)}, side-by-side at 1024px is ${String(sideBySide)} — ` +
            `boxes at 360px: ${boxText(narrow.sidebar)} / ${boxText(narrow.content)}, at 1024px: ${boxText(wide.sidebar)} / ${boxText(wide.content)}`,
        };
      }
      return {
        verdict: "PASS",
        detail: `panels stack in document order at 360px (content top ${String(narrow.content?.y ?? 0)}) and sit side by side at 1024px`,
      };
    },
  });

  defs.push({
    id: "geometry",
    capability: "layout",
    run: async (page) => {
      await gotoPage(page, options, BUTTON_PAGE);
      await demoMounted(page, BUTTON_PAGE);
      const geometry = await page.evaluate(() => {
        const button = document.querySelector("figure button");
        if (!(button instanceof HTMLElement)) return null;
        const rect = button.getBoundingClientRect();
        return {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
        };
      });
      if (geometry === null) {
        throw new Error(
          "the button page has no figure button — presupposition of every layout case",
        );
      }
      const rectText = `${String(geometry.width)}x${String(geometry.height)} at (${String(geometry.x)}, ${String(geometry.y)})`;
      const sizeOk = geometry.width > 8 && geometry.height > 8;
      const aspect = geometry.height === 0 ? Infinity : geometry.width / geometry.height;
      const aspectOk = aspect >= 0.2 && aspect <= 12;
      const onPage = geometry.x >= 0 && geometry.x < geometry.innerWidth && geometry.y >= 0;
      if (!sizeOk || !aspectOk || !onPage) {
        return {
          verdict: "FAIL",
          detail:
            `degenerate button box ${rectText} in a ${String(geometry.innerWidth)}x${String(geometry.innerHeight)} viewport — ` +
            (!sizeOk
              ? "a dimension is at or below 8px (the PoC's 5x5 signature)"
              : !aspectOk
                ? `aspect ${aspect.toFixed(2)} is outside the sane 0.2–12 band`
                : "the box sits off-page"),
        };
      }
      return {
        verdict: "PASS",
        detail: `button box ${rectText} in a ${String(geometry.innerWidth)}x${String(geometry.innerHeight)} viewport (PoC chromium reference: 40x40 at y=414)`,
      };
    },
  });

  defs.push({
    id: "media-queries",
    capability: "layout",
    run: async (page) => {
      await gotoPage(page, options, APP_SHELL_PAGE);
      await demoMounted(page, APP_SHELL_PAGE);
      await resizeViewport(page, MEDIA_WIDE_VIEWPORT);
      const wide = await page.evaluate(
        (query: string) => window.matchMedia(query).matches,
        MEDIA_QUERY,
      );
      await resizeViewport(page, MEDIA_NARROW_VIEWPORT);
      const narrow = await page.evaluate(
        (query: string) => window.matchMedia(query).matches,
        MEDIA_QUERY,
      );
      if (wide === narrow) {
        return {
          verdict: "FAIL",
          detail: `matchMedia("${MEDIA_QUERY}") is ${String(wide)} at both ${String(MEDIA_WIDE_VIEWPORT.width)}px and ${String(MEDIA_NARROW_VIEWPORT.width)}px — the media engine does not track the emulated viewport`,
        };
      }
      if (!wide || narrow) {
        return {
          verdict: "FAIL",
          detail: `matchMedia("${MEDIA_QUERY}") flipped the wrong way: ${String(wide)} at ${String(MEDIA_WIDE_VIEWPORT.width)}px, ${String(narrow)} at ${String(MEDIA_NARROW_VIEWPORT.width)}px`,
        };
      }
      return {
        verdict: "PASS",
        detail: `matchMedia("${MEDIA_QUERY}") flips with the emulated viewport (true at ${String(MEDIA_WIDE_VIEWPORT.width)}px, false at ${String(MEDIA_NARROW_VIEWPORT.width)}px)`,
      };
    },
  });

  defs.push({
    id: "theme-switch",
    capability: "cascade",
    // Runs after the cascade cases and cleans up: it persists the theme in
    // localStorage, and a case that left the site dark would turn every later
    // cascade measurement into a dark-theme one.
    run: async (page) => {
      await gotoPage(page, options, BUTTON_PAGE);
      await setAppearance(page, "light");
      const light = await themeState(page, LIGHT_BODY_RED_MIN, false);
      await setAppearance(page, "dark");
      const dark = await themeState(page, DARK_BODY_RED_MAX, true);
      await page.evaluate(() => {
        localStorage.removeItem("vitepress-theme-appearance");
      });
      if (light === null || dark === null) {
        return {
          verdict: "FAIL",
          detail: `the theme never settled: light phase ${themeText(light)}, dark phase ${themeText(dark)} — VitePress's appearance script did not repaint the cascade`,
        };
      }
      const flipped = dark.dataTheme === "dark" && light.dataTheme === "light";
      const repainted = dark.red < dark.threshold && light.red > light.threshold;
      if (!flipped || !repainted) {
        return {
          verdict: "FAIL",
          detail: `theme flip incomplete — light ${themeText(light)}, dark ${themeText(dark)}; attribute flip ${String(flipped)}, repaint ${String(repainted)}`,
        };
      }
      return {
        verdict: "PASS",
        detail: `data-theme flips light→dark and the body repaints (red channel ${String(light.red)} → ${String(dark.red)})`,
      };
    },
  });

  defs.push({
    id: "focus",
    capability: "interaction",
    // Evidence for the focus-not-obscured reroute, not one of the 12 rules'
    // needs: activeElement is DOM truth, scroll-into-view is layout — which is
    // why the split verdict (DEGRADED) exists here.
    run: async (page) => {
      await gotoPage(page, options, BUTTON_PAGE);
      await demoMounted(page, BUTTON_PAGE);
      const focus = await page.evaluate(() => {
        const enabled = Array.from(
          document.querySelectorAll<HTMLElement>("button:not(:disabled)"),
        ).filter((b) => !b.hasAttribute("aria-disabled"));
        const belowFold = enabled.find((b) => b.getBoundingClientRect().top > window.innerHeight);
        const target = belowFold ?? enabled[enabled.length - 1] ?? null;
        if (target === null) return null;
        target.focus();
        const focused = document.activeElement === target;
        window.scrollTo(0, 0);
        target.scrollIntoView({ block: "center" });
        const rect = target.getBoundingClientRect();
        return {
          focused,
          inView: rect.height > 0 && rect.top >= 0 && rect.bottom <= window.innerHeight,
          belowFold: belowFold !== undefined,
          rect: `${String(rect.width)}x${String(rect.height)} at y=${String(Math.round(rect.top))}`,
        };
      });
      if (focus === null) {
        throw new Error("the button page has no enabled button to focus");
      }
      if (!focus.focused) {
        return {
          verdict: "FAIL",
          detail: `focus() did not move document.activeElement (rect ${focus.rect}, below-fold target ${String(focus.belowFold)})`,
        };
      }
      if (!focus.inView) {
        return {
          verdict: "DEGRADED",
          detail: `focus works but scrollIntoView left the target out of view (rect ${focus.rect}) — scroll/geometry half missing`,
        };
      }
      return {
        verdict: "PASS",
        detail: `activeElement tracks focus() and scrollIntoView brings the target into view (rect ${focus.rect}, below-fold target ${String(focus.belowFold)})`,
      };
    },
  });

  defs.push({
    id: "hit-testing",
    capability: "hit-testing",
    // The API aria-hidden-focus and bypass need on the modal-open path.
    run: async (page) => {
      await gotoPage(page, options, BUTTON_PAGE);
      await demoMounted(page, BUTTON_PAGE);
      const hit = await page.evaluate(() => {
        const button = document.querySelector("figure button");
        if (!(button instanceof HTMLElement)) return null;
        if (typeof document.elementsFromPoint !== "function") {
          return { api: false, centered: null as boolean | null, count: -1 };
        }
        const rect = button.getBoundingClientRect();
        const cx = rect.x + rect.width / 2;
        const cy = rect.y + rect.height / 2;
        const stack = document.elementsFromPoint(cx, cy);
        return {
          api: true,
          centered: stack.some((n) => n === button || button.contains(n)),
          count: stack.length,
        };
      });
      if (hit === null) {
        throw new Error(
          "the button page has no figure button — presupposition of the hit-testing case",
        );
      }
      if (!hit.api) {
        return { verdict: "FAIL", detail: "document.elementsFromPoint is not a function" };
      }
      if (hit.centered !== true) {
        return {
          verdict: "FAIL",
          detail: `elementsFromPoint at the button's center returned ${String(hit.count)} element(s), none of them the button — the PoC's degenerate-geometry signature`,
        };
      }
      return {
        verdict: "PASS",
        detail: `elementsFromPoint at the button's center resolves the button (${String(hit.count)} element(s) in the stack)`,
      };
    },
  });

  defs.push({
    id: "axe-injection",
    capability: "axe",
    // Last, and deliberately: this is the case that crashed the PoC's page
    // target, and an engine that dies here has already answered every earlier
    // case.
    run: async (page) => {
      await gotoPage(page, options, BUTTON_PAGE);
      await demoMounted(page, BUTTON_PAGE);
      // addScriptTag, not evaluate: it is what the PoC used, so a crash here
      // is like-for-like with the measured one. The throw becomes ERROR (page
      // target closed = cannot measure), which is the strongest negative the
      // probe can report.
      await page.addScriptTag({ content: deps.axeSource() });
      const run = await page.evaluate(async (ruleIds: readonly string[]) => {
        const axeGlobal = (
          window as unknown as {
            axe?: { run(context: Document, options: unknown): Promise<AxeRunResult> };
          }
        ).axe;
        if (axeGlobal === undefined) {
          return { ok: false, why: "window.axe missing after injection", ran: [], violations: -1 };
        }
        try {
          const results = await axeGlobal.run(document, {
            runOnly: { type: "rule", values: ruleIds },
          });
          const ran = new Set<string>();
          let violations = 0;
          for (const bucket of [
            results.violations,
            results.passes,
            results.incomplete,
            results.inapplicable,
          ]) {
            for (const rule of bucket) {
              ran.add(rule.id);
              if (bucket === results.violations) violations += rule.nodes.length;
            }
          }
          return { ok: true, why: "", ran: Array.from(ran), violations };
        } catch {
          return { ok: false, why: "axe.run threw inside the page", ran: [], violations: -1 };
        }
      }, AXE_PROBE_RULES);
      if (!run.ok) {
        return { verdict: "FAIL", detail: `axe did not run: ${run.why}` };
      }
      const missing = AXE_PROBE_RULES.filter((rule) => !run.ran.includes(rule));
      if (missing.length > 0) {
        return {
          verdict: "DEGRADED",
          detail: `axe ran but ${String(missing.length)} of ${String(AXE_PROBE_RULES.length)} browser-required rules produced no result: ${missing.join(", ")}`,
        };
      }
      return {
        verdict: "PASS",
        detail: `all ${String(AXE_PROBE_RULES.length)} browser-required rules answered without crashing the page (${String(run.violations)} violation node(s))`,
      };
    },
  });

  return defs;
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AxeRunResult {
  violations: { id: string; nodes: unknown[] }[];
  passes: { id: string; nodes: unknown[] }[];
  incomplete: { id: string; nodes: unknown[] }[];
  inapplicable: { id: string; nodes: unknown[] }[];
}

const boxText = (box: Box | null): string =>
  box === null
    ? "none"
    : `${String(box.width)}x${String(box.height)} at (${String(Math.round(box.x))}, ${String(Math.round(box.y))})`;

const boxesOf = async (page: CasePage): Promise<{ sidebar: Box | null; content: Box | null }> =>
  page.evaluate(() => {
    const figure = document.querySelector("figure");
    const box = (el: Element | null): Box | null => {
      if (el === null) return null;
      const rect = el.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    };
    return {
      sidebar: box(figure === null ? null : figure.querySelector("aside")),
      content: box(figure === null ? null : figure.querySelector("aside + div")),
    };
  });

/** Point VitePress's appearance key at a theme and wait for the repaint to
 * land — the same key the site's own toggle writes, per
 * e2e/accessibility.e2e.ts's loadInLight/loadInDark rationale. */
async function setAppearance(page: CasePage, theme: "light" | "dark"): Promise<void> {
  await page.evaluate((value: string) => {
    localStorage.setItem("vitepress-theme-appearance", value);
  }, theme);
  await page.reload({ waitUntil: "load", timeout: NAV_TIMEOUT_MS });
}

interface ThemeState {
  dataTheme: string;
  red: number;
  threshold: number;
  atMost: boolean;
}

const themeText = (state: ThemeState | null): string =>
  state === null
    ? "never settled"
    : `data-theme=${state.dataTheme}, body red ${String(state.red)} (needs ${
        state.atMost ? `< ${String(state.threshold)}` : `>= ${String(state.threshold)}`
      })`;

/** Read the theme the cascade actually painted: the data-theme attribute plus
 * the body background's red channel, checked against the bound that channel
 * must clear for the theme — at least `redThreshold` in light, at most it in
 * dark (the shipped suite's own predicates). null when the background never
 * settles — the no-cascade case. */
async function themeState(
  page: CasePage,
  redThreshold: number,
  atMost: boolean,
): Promise<ThemeState | null> {
  // The bounds travel as one serialized argument: an evaluate callback cannot
  // close over this file's scope (Playwright serializes it into the page),
  // which is exactly how the red-channel helper this replaces broke — it
  // type-checked clean here and still could not run in a page.
  const bounds = { threshold: redThreshold, atMost };
  const settled = await page
    .waitForFunction(
      (limits: { threshold: number; atMost: boolean }) => {
        const match = /rgba?\(\s*(\d+)/.exec(getComputedStyle(document.body).backgroundColor);
        if (match === null) return false;
        const red = Number(match[1] ?? 0);
        return limits.atMost ? red < limits.threshold : red >= limits.threshold;
      },
      bounds,
      { timeout: RESIZE_TIMEOUT_MS },
    )
    .then(
      () => true,
      () => false,
    );
  if (!settled) return null;
  return page.evaluate((limits: { threshold: number; atMost: boolean }) => {
    const match = /rgba?\(\s*(\d+)/.exec(getComputedStyle(document.body).backgroundColor);
    return {
      dataTheme: document.documentElement.getAttribute("data-theme") ?? "",
      red: match === null ? -1 : Number(match[1] ?? -1),
      threshold: limits.threshold,
      atMost: limits.atMost,
    };
  }, bounds);
}

// ---- execution -------------------------------------------------------------------

const axeSourcePath = (): string => join(ROOT, "node_modules", "axe-core", "axe.min.js");

const axeSource = (): string => {
  const path = axeSourcePath();
  if (!existsSync(path)) {
    throw new Error(
      `axe-core not found at ${path} — the axe-injection case injects the devDependency's own build`,
    );
  }
  return readFileSync(path, "utf8");
};

/**
 * Connect, run every case, report. One page per case from the CDP browser's
 * default context — `browser.newContext()` would isolate harder but is the
 * first API a partial CDP implementation declines, and an engine that cannot
 * host a second context is exactly the engine this probe exists to measure.
 * `browser.close()` on a connectOverCDP handle only disconnects; the caller's
 * engine (their docker container) is left running.
 */
export async function executeProbe(options: ProbeOptions): Promise<ProbeReport> {
  try {
    return await runProbe(options);
  } catch (error) {
    // A connection-level failure (engine not up, CDP handshake refused) still
    // emits a report so `--out` consumers and CI logs see the same shape —
    // with a single ERROR case carrying the reason.
    return buildReport(options.engine, options.base, new Date().toISOString(), [
      {
        id: "connect",
        capability: "probe",
        verdict: "ERROR",
        detail: `${describeError(error)} — could not reach the CDP endpoint ${options.cdp}`,
      },
    ]);
  }
}

async function runProbe(options: ProbeOptions): Promise<ProbeReport> {
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.connectOverCDP(options.cdp, { timeout: NAV_TIMEOUT_MS });
  try {
    const context = browser.contexts()[0] ?? null;
    const ctx: CaseContext = {
      openPage: async () => {
        const page = context === null ? await browser.newPage() : await context.newPage();
        page.setDefaultTimeout(NAV_TIMEOUT_MS);
        return page;
      },
      discardPage: async (page) => {
        try {
          await page.close();
        } catch {
          // The page may already be gone (the axe-crash signature); cleanup
          // failure is not evidence.
        }
      },
    };
    const results: CaseResult[] = [];
    for (const def of buildCases({ options, axeSource })) {
      const result = await runCase(def, ctx, options.timeoutMs);
      results.push(result);
      console.error(`probe: ${result.id} → ${result.verdict}`);
    }
    return buildReport(options.engine, options.base, new Date().toISOString(), results);
  } finally {
    await browser.close().catch(noop);
  }
}

// ---- CLI --------------------------------------------------------------------------

export type ParsedCli =
  | { kind: "help" }
  | { kind: "self-test" }
  | { kind: "options"; options: ProbeOptions }
  | { kind: "error"; error: string };

/** Narrow a parsed CLI to its options — one guard for every caller that needs
 * the real thing (the self-test; main narrows by early return instead). */
function expectOptions(parsed: ParsedCli): ProbeOptions {
  if (parsed.kind !== "options") {
    throw new Error(`expected parsed options, got kind "${parsed.kind}"`);
  }
  return parsed.options;
}

/** Turn parseArgs' result into a ParsedCli. The parameter spells out the flag
 * types instead of letting parseArgs' generic through: untyped, every value
 * reads as `string | boolean | (string | boolean)[]` and the error messages
 * built from them stop type-checking. --timeout-ms stays a string option
 * because parseArgs has no number type — it is parsed (and refused) here. */
function parsedToCli(parsed: {
  values: {
    cdp?: string;
    base?: string;
    engine?: string;
    out?: string;
    "report-only"?: boolean;
    "self-test"?: boolean;
    help?: boolean;
    "timeout-ms"?: string;
  };
}): ParsedCli {
  const values = parsed.values;
  if (values.help === true) return { kind: "help" };
  if (values["self-test"] === true) return { kind: "self-test" };
  const base = values.base ?? DEFAULT_BASE;
  try {
    const url = new URL(base);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { kind: "error", error: `--base must be an http(s) URL, got "${base}"` };
    }
  } catch {
    return { kind: "error", error: `--base is not a URL: "${base}"` };
  }
  const timeoutRaw = values["timeout-ms"] ?? String(DEFAULT_CASE_TIMEOUT_MS);
  const timeoutMs = Number(timeoutRaw);
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return {
      kind: "error",
      error: `--timeout-ms must be a positive number of milliseconds, got "${timeoutRaw}"`,
    };
  }
  const options: ProbeOptions = {
    cdp: values.cdp ?? DEFAULT_CDP,
    base,
    engine: values.engine ?? DEFAULT_ENGINE,
    reportOnly: values["report-only"] === true,
    timeoutMs,
  };
  const out = values.out;
  if (out !== undefined) options.out = out;
  return { kind: "options", options };
}

export function parseCli(argv: readonly string[]): ParsedCli {
  try {
    return parsedToCli(
      parseArgs({
        args: [...argv],
        options: {
          cdp: { type: "string", default: DEFAULT_CDP },
          base: { type: "string", default: DEFAULT_BASE },
          engine: { type: "string", default: DEFAULT_ENGINE },
          out: { type: "string" },
          "report-only": { type: "boolean", default: false },
          "self-test": { type: "boolean", default: false },
          help: { type: "boolean", default: false },
          "timeout-ms": { type: "string", default: String(DEFAULT_CASE_TIMEOUT_MS) },
        },
        allowPositional: false,
      }),
    );
  } catch (error) {
    return { kind: "error", error: describeError(error) };
  }
}

function printHelp(): void {
  process.stdout
    .write(`browser-capability-probe — can a lightweight CDP engine host any of Loom's browser-required rules?

Usage:
  node --experimental-strip-types tools/browser-capability-probe.ts [options]

Options:
  --cdp <url>         CDP endpoint of the engine under test
                      (default: ${DEFAULT_CDP})
  --base <url>        HTTP base of the SERVED built docs site; page paths
                      resolve against it (default: ${DEFAULT_BASE})
  --engine <name>     label the report carries, version included
                      (default: ${DEFAULT_ENGINE})
  --out <file>        also write the JSON report to this file (relative paths
                      resolve against the repository root)
  --report-only       always exit 0 — for humans reading a report, not gates
  --timeout-ms <n>    per-case watchdog (default: ${String(DEFAULT_CASE_TIMEOUT_MS)})
  --self-test         exercise the probe's own logic; no engine, no network
  --help              this text

Recipe (one terminal each):
  1. build and serve the docs site:
       pnpm docs:build && pnpm docs:preview
     ...which serves ${DEFAULT_BASE}
  2. start the engine's CDP endpoint — the PoC's Lightpanda, as measured
     2026-09-11 (any CDP-speaking engine works; this probe names no vendor):
       docker run --rm -p 9222:9222 lightpanda/browser:1.0.0-nightly.9356 serve --port 9222
  3. probe it:
       node --experimental-strip-types tools/browser-capability-probe.ts \\
         --engine lightpanda-1.0.0-nightly.9356

Output: one JSON object on stdout (shape documented in
perf/browser-capability-contract.md); human progress goes to stderr.
Exit 0 only when every case PASSED — DEGRADED and ERROR fail closed —
unless --report-only. This tool measures; it is not a gate.\n`);
}

async function main(): Promise<void> {
  const parsed = parseCli(process.argv.slice(2));
  if (parsed.kind === "error") {
    console.error(`browser-capability-probe: ${parsed.error}`);
    printHelp();
    process.exitCode = 2;
    return;
  }
  if (parsed.kind === "help") {
    printHelp();
    return;
  }
  if (parsed.kind === "self-test") {
    await runSelfTest();
    return;
  }
  const report = await executeProbe(parsed.options);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (parsed.options.out !== undefined) {
    // Relative paths resolve against the repository root, the same convention
    // the axe-source reader uses; an absolute path lands where it says.
    const outPath = join(ROOT, parsed.options.out);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
    console.error(`probe: report written to ${outPath}`);
  }
  const exit = exitCodeFor(report, parsed.options.reportOnly);
  console.error(
    `probe: ${String(report.summary.pass)}/${String(report.summary.total)} passed — ` +
      `hosted classes: ${report.hostedClasses.length > 0 ? report.hostedClasses.join("; ") : "none"}`,
  );
  process.exitCode = exit;
}

// ---- self-test ---------------------------------------------------------------------

/**
 * The pure-logic self-check, runnable without any engine — `--self-test`, and
 * the same function the vitest tier calls. It pins the wiring the probe lives
 * by: CLI parsing, the runner's fail-closed mapping (throw → ERROR, stall →
 * ERROR, page discarded either way), the verdict tally, the class gates, the
 * report shape and the exit-code contract. The rule-list drift pin — the one
 * check that needs the repository's own source — lives in
 * browser-capability-probe.test.ts, where reading the tree is expected.
 */
export async function runSelfTest(): Promise<void> {
  let checks = 0;
  const ok = (claim: boolean, message: string): void => {
    assert.equal(claim, true, message);
    checks += 1;
  };

  // CLI parsing.
  ok(parseCli(["--help"]).kind === "help", "--help is recognized");
  ok(parseCli(["--self-test"]).kind === "self-test", "--self-test is recognized");
  const defaults = expectOptions(parseCli([]));
  assert.equal(defaults.cdp, DEFAULT_CDP);
  assert.equal(defaults.base, DEFAULT_BASE);
  assert.equal(defaults.reportOnly, false);
  assert.equal(defaults.out, undefined);
  ok(defaults.timeoutMs === DEFAULT_CASE_TIMEOUT_MS, "the watchdog default applies");
  const full = expectOptions(
    parseCli([
      "--engine",
      "lightpanda-x",
      "--cdp",
      "ws://example.test:1234",
      "--base",
      "http://example.test/site/",
      "--out",
      "/tmp/report.json",
      "--report-only",
      "--timeout-ms",
      "5000",
    ]),
  );
  ok(full.engine === "lightpanda-x", "--engine is read");
  ok(full.cdp === "ws://example.test:1234", "--cdp is read");
  ok(full.out === "/tmp/report.json", "--out is read");
  ok(full.reportOnly, "--report-only is read");
  ok(full.timeoutMs === 5000, "--timeout-ms is read");
  ok(parseCli(["--base", "not a url"]).kind === "error", "a --base that is not a URL is refused");
  ok(parseCli(["--base", "ftp://example.test/"]).kind === "error", "a non-http --base is refused");
  ok(parseCli(["--wat"]).kind === "error", "an unknown flag is refused");
  ok(parseCli(["positional"]).kind === "error", "a positional argument is refused");
  ok(parseCli(["--timeout-ms", "0"]).kind === "error", "a non-positive watchdog is refused");
  ok(parseCli(["--timeout-ms", "soon"]).kind === "error", "a non-numeric watchdog is refused");

  // The case runner's fail-closed mapping, against synthetic cases — no page
  // is ever touched, so an empty object stands in for one. The promises are
  // built eagerly rather than awaited: what a throw or a stall MEANS is the
  // runner's decision, and that mapping is what these pin.
  const unusedPage = {} as CasePage;
  let discarded = 0;
  const countingCtx: CaseContext = {
    openPage: () => Promise.resolve(unusedPage),
    discardPage: (_page: CasePage) => {
      discarded += 1;
      return Promise.resolve();
    },
  };

  const passing = await runCase(
    {
      id: "ok",
      capability: "dom",
      run: () => Promise.resolve({ verdict: "PASS", detail: "measured" }),
    },
    countingCtx,
    1000,
  );
  assert.deepEqual(
    { id: passing.id, verdict: passing.verdict, detail: passing.detail },
    { id: "ok", verdict: "PASS", detail: "measured" },
  );
  ok(discarded === 1, "the page is discarded on the happy path");

  const failing = await runCase(
    {
      id: "bad",
      capability: "layout",
      run: () => Promise.resolve({ verdict: "FAIL", detail: "styleSheets: 0" }),
    },
    countingCtx,
    1000,
  );
  ok(
    failing.verdict === "FAIL" && failing.detail === "styleSheets: 0",
    "a measured FAIL passes through with its detail",
  );

  const degraded = await runCase(
    {
      id: "partial",
      capability: "interaction",
      run: () => Promise.resolve({ verdict: "DEGRADED", detail: "focus ok, scroll not" }),
    },
    countingCtx,
    1000,
  );
  ok(degraded.verdict === "DEGRADED", "a measured DEGRADED passes through");

  const throwing = await runCase(
    {
      id: "boom",
      capability: "axe",
      run: () => Promise.reject(new Error("Target closed")),
    },
    countingCtx,
    1000,
  );
  ok(
    throwing.verdict === "ERROR" && throwing.detail.includes("Target closed"),
    "a throwing case becomes ERROR carrying the message",
  );
  ok(discarded === 4, "the page is discarded even when the case throws");

  const stalled = await runCase(
    // An executor that never settles — it has nothing to do, and the empty
    // body the lint would allow is not the shape this wants anyway.
    { id: "stall", capability: "dom", run: () => new Promise<CaseRun>(() => undefined) },
    countingCtx,
    20,
  );
  ok(
    stalled.verdict === "ERROR" && stalled.detail.includes("no answer within"),
    "a stalled case hits the watchdog and becomes ERROR",
  );
  ok(discarded === 5, "the page is discarded after a watchdog");

  // Tally, class gates, verdict text.
  const verdict = (id: string, v: CaseVerdict): CaseResult => ({
    id,
    capability: "dom",
    verdict: v,
    detail: id,
  });
  const allPass = CASE_CATALOG.map(({ id }) => verdict(id, "PASS"));
  assert.deepEqual(tally(allPass), {
    pass: allPass.length,
    degraded: 0,
    fail: 0,
    error: 0,
    total: allPass.length,
  });
  const mixed = [
    verdict("dom-mount", "PASS"),
    verdict("css-loading", "FAIL"),
    verdict("css-cascade", "DEGRADED"),
    verdict("axe-injection", "ERROR"),
  ];
  assert.deepEqual(tally(mixed), { pass: 1, degraded: 1, fail: 1, error: 1, total: 4 });
  ok(
    hostedClasses(allPass).includes("cascade+layout (class B: 12 rules)"),
    "an all-PASS run hosts class B",
  );
  ok(
    hostedClasses(allPass).includes("dom+hit-testing (aria-hidden-focus, bypass)"),
    "an all-PASS run hosts dom+hit-testing",
  );
  const noCascade = allPass.filter((c) => c.id !== "css-cascade");
  ok(
    !hostedClasses(noCascade).some((c) => c.includes("cascade+layout")),
    "one failed cascade case revokes class B — the gate is conjunctive",
  );
  ok(hostedClasses([verdict("dom-mount", "DEGRADED")]).length === 0, "DEGRADED grants nothing");
  ok(
    hostedClasses([verdict("dom-mount", "PASS"), verdict("css-loading", "PASS")]).every(
      (c) => !c.includes("cascade+layout"),
    ),
    "cascade without layout hosts no class B",
  );
  ok(
    verdictText([]).includes("no capability verified"),
    "an empty class list reads as hosting nothing",
  );

  // Report shape and exit code.
  const report = buildReport("engine-x", "http://base/", "2026-09-11T00:00:00Z", allPass);
  ok(validateReport(report).length === 0, "the probe's own report validates clean");
  ok(exitCodeFor(report, false) === 0, "an all-PASS report exits 0");
  ok(exitCodeFor(report, true) === 0, "--report-only exits 0 regardless");
  const broken = buildReport("engine-x", "http://base/", "2026-09-11T00:00:00Z", [
    ...allPass.slice(0, -1),
    verdict("axe-injection", "ERROR"),
  ]);
  ok(exitCodeFor(broken, false) === 1, "any non-PASS case exits 1 — fail closed");
  ok(
    validateReport({ ...report, summary: { ...report.summary, pass: 999 } }).length > 0,
    "a summary that disagrees with its cases fails validation",
  );
  ok(
    validateReport({ ...report, cases: report.cases.slice(0, -1) }).length > 0,
    "cases the summary does not count fail validation",
  );
  ok(
    validateReport({
      ...report,
      cases: [{ id: "x", capability: "dom", verdict: "MAYBE" }],
    }).length > 0,
    "a case with an unknown verdict and no detail fails validation",
  );
  ok(
    validateReport({ ...report, verdict: "" }).length > 0,
    "an empty verdict line fails validation",
  );
  ok(validateReport("nope").length > 0, "a non-object report fails validation");

  // The catalog the runner iterates: unique ids, and every id the class gates
  // name actually exists in it.
  const ids = CASE_CATALOG.map((c) => c.id);
  ok(new Set(ids).size === ids.length, "case ids are unique");
  for (const gate of [...CLASS_B_GATE, "hit-testing", "axe-injection", "dom-mount"]) {
    ok(ids.includes(gate), `the class gates only name cases that exist (${gate})`);
  }
  ok(
    CASE_CATALOG.every((c) => !c.id.includes(" ")),
    "case ids are report-key safe",
  );

  // The axe partition's arithmetic, without the repository: the three
  // sub-partitions compose the full browser-required set exactly once.
  ok(
    AXE_PROBE_RULES.length ===
      CASCADE_LAYOUT_RULES.length + DOM_HIT_TEST_RULES.length + FULL_BROWSER_RULES.length,
    "the three sub-partitions sum to the axe rule list",
  );
  ok(
    new Set(AXE_PROBE_RULES).size === AXE_PROBE_RULES.length,
    "no rule appears twice in the axe list",
  );

  console.error(`self-test: ${String(checks)} checks passed`);
}

if (import.meta.main) {
  void main().catch((error: unknown) => {
    console.error(`browser-capability-probe: ${describeError(error)}`);
    process.exitCode = 1;
  });
}
