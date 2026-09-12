/**
 * The root suite's per-page checks, single-sourced so two consumers share
 * them without either importing a spec from a spec: the production specs
 * (accessibility, contrast, target-size, keyboard) and the B2 shared-page
 * bench (e2e/b2-shared-page.e2e.ts). A spec that imported a spec would
 * register the imported file's tests into the importing run — so every
 * check body lives here, the specs import it, and the bench imports it.
 *
 * The bodies are moved verbatim from the specs they served, under their
 * own names (contrast's in-page walk is the one rename: it became
 * `sweepMeasureInPage` because target-size's exported `measureInPage`
 * shares the module). The specs import them under the same names, so the
 * production test bodies, titles, and timed phases are byte-for-byte what
 * they were. No test() calls at module level — that is what makes this
 * file importable from both kinds of files.
 */

import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { BROWSERLESS_RULES, BROWSER_REQUIRED_RULES } from "@ecoma-io/loom/a11y";
import { timed } from "../playwright/timings";

// Tell VitePress to start in light mode. The `vitepress-theme-appearance`
// key is the one VitePress's own toggle writes to; its inline script reads
// it before first paint to set `.dark`, and Layout.vue's watchEffect then
// mirrors it onto `data-theme`. Setting it before navigation reproduces the
// path a real user takes through the toggle — no manual DOM mutation, no
// risk of the reactive system reverting it mid-scan.
export async function loadInLight(browserPage: Page, target: string): Promise<void> {
  await browserPage.addInitScript(() => {
    localStorage.setItem("vitepress-theme-appearance", "light");
  });
  await timed("goto", () => browserPage.goto(target));
  // Ensure the repaint has landed before axe reads computed colours.
  await timed("wait-repaint", () =>
    browserPage.waitForFunction(() => {
      const match = /rgba?\((\d+),/.exec(getComputedStyle(document.body).backgroundColor);
      return match && Number(match[1]) > 200;
    }),
  );
}

// Tell VitePress to start in dark mode. Setting the localStorage key before
// navigation means VitePress's inline script adds `.dark` before first paint,
// Layout.vue's watchEffect mirrors it onto `data-theme`, and the page arrives
// in the same state a real user sees after toggling — no manual DOM mutation,
// no risk of the reactive system reverting it mid-scan.
export async function loadInDark(browserPage: Page, target: string): Promise<void> {
  await browserPage.addInitScript(() => {
    localStorage.setItem("vitepress-theme-appearance", "dark");
  });
  await timed("goto", () => browserPage.goto(target));
  // Wait for the browser to repaint with the dark theme. VitePress's inline
  // script sets `.dark` before paint, and Layout.vue's watchEffect sets
  // `data-theme` during hydration — but the repaint is asynchronous, and
  // axe can run before the computed colours update, reading stale values.
  await timed("wait-repaint", () =>
    browserPage.waitForFunction(() => {
      const bodyBg = getComputedStyle(document.body).backgroundColor;
      // Dark backgrounds have very low RGB values.
      const match = /rgba?\((\d+),/.exec(bodyBg);
      return match && Number(match[1]) < 50;
    }),
  );
}

// The light pass's axe run: the full effective rule set, exactly as the light
// test has always configured it.
export const scanEffectiveRules = (browserPage: Page) =>
  new AxeBuilder({ page: browserPage })
    // The rule lists, not the tags: a tag-type runOnly cannot select the
    // five rules adopted out of axe's disabled set on 2026-08-26, and this
    // gate is the only judge of the built site's non-demo content — the
    // prose and the token tables `design-tokens.ts` emits, exactly the
    // markup `td-has-header` and `table-fake-caption` exist for. The site
    // is held to the same 68-rule effective set as the demo tiers, with no
    // gap between them.
    .withRules([
      ...(BROWSERLESS_RULES as readonly string[]),
      ...(BROWSER_REQUIRED_RULES as readonly string[]),
    ] as string[])
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

// The dark pass re-runs `color-contrast` alone.
// Measured 2026-08-26: a page's DOM in light and dark is byte-identical
// except the `data-theme` attribute, the `.dark` class, and VitePress's
// appearance-toggle `title`/`aria-checked` (its accessible name flips —
// non-empty in both). Therefore semantic and geometry rules re-prove the
// same input they already proved in the light pass; only color-dependent
// checks can differ. The union of light-full + dark-contrast equals the
// old coverage (the full rule set in both themes), and the dark pass is
// ~27% faster because the semantic rules are not re-run on identical
// DOM — the light pass runs all 68 effective rules, the five adopted
// from axe's disabled set on 2026-08-26 included, so only color-
// dependent checks can differ between the themes, and this pass re-runs
// exactly those.
// In reuse mode that premise is not just history: reachDark (e2e/theme.ts)
// asserts it on every page it collapses, so a VitePress or Demo.vue change
// that drifts the themes' DOM apart turns the suite red instead of
// silently weakening the dark pass.
export const scanColorContrast = (browserPage: Page) =>
  new AxeBuilder({ page: browserPage })
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

export const formatViolations = (violations: Violations): string =>
  violations
    .map((violation) => {
      const targets = violation.nodes.map((node) => node.target.join(" ")).join(", ");
      return `[${violation.impact ?? "unknown"}] ${violation.id}: ${violation.help} (${targets})`;
    })
    .join("\n");

type Violations = Awaited<ReturnType<typeof scanColorContrast>>["violations"];

// ── contrast ──────────────────────────────────────────────────────────────────────

// Renamed on the move — target-size's exported `measureInPage` shares the module.
const sweepMeasureInPage = () => {
  // Hoisted helpers: `page.evaluate` serialises the function body, so the
  // whole measurement lives inside the page and only the findings come back.
  return (() => {
    // Browsers may return colours in rgb(), rgba(), oklab(), or oklch().
    // The measurement needs sRGB channel values, so oklab/oklch are
    // converted through a temporary canvas to avoid maintaining the
    // transform by hand. rgb/rgba are parsed directly — the canvas
    // round-trip would lose precision on values that are already in the
    // right space.
    const _canvas = document.createElement("canvas");
    _canvas.width = 1;
    _canvas.height = 1;
    const _ctx = _canvas.getContext("2d")!;
    // Counted, not trusted dormant: today every computed colour on the swept
    // pages is expected to serialize as rgb/rgba, so the canvas round-trip
    // below should never produce a value a ratio is computed from. The count
    // covers only conversions that returned a colour — an unparseable string
    // that comes back transparent (alpha 0, e.g. a paint-server url) is
    // measurement-excluded, not precision-lossy. The tests assert the count
    // is zero and name the offending strings, so a non-rgb serialization
    // turns the sweep red with the evidence to decide beside it.
    let canvasConversions = 0;
    const canvasConverted: string[] = [];
    const transformMismatches: string[] = [];

    function toSRGB(str: string): { r: number; g: number; b: number; a: number } | null {
      const s = str.trim();
      // Fast path: rgb/rgba are already in sRGB.
      const rgb = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(s);
      if (rgb) {
        return {
          r: Number(rgb[1]),
          g: Number(rgb[2]),
          b: Number(rgb[3]),
          a: rgb[4] === undefined ? 1 : +rgb[4],
        };
      }
      // Oklab — the resolved form the docs theme's color-mix(in oklab, …)
      // soft surfaces serialize to (named by the tripwire on CI, 2026-09-11).
      // Ottosson's closed form is exact: oklab → LMS′ → cube → linear sRGB →
      // encode. Malformed components fall through to the canvas below, which
      // still counts them — fail-closed.
      const oklab = /^oklab\(([^)]*)\)$/.exec(s);
      if (oklab) {
        const num = (t: string): number =>
          t.endsWith("%") ? Number.parseFloat(t) / 100 : Number.parseFloat(t);
        const [body = "", alphaText = ""] = (oklab[1] ?? "").split("/").map((p) => p.trim());
        const [lText = "", aText = "", bText = ""] = body.split(/\s+/);
        const L = num(lText);
        const aa = num(aText);
        const bb = num(bText);
        const alpha = alphaText === "" ? 1 : num(alphaText);
        if ([L, aa, bb, alpha].every((v) => !Number.isNaN(v))) {
          const l_ = L + 0.3963377774 * aa + 0.2158037573 * bb;
          const m_ = L - 0.1055613458 * aa - 0.0638541728 * bb;
          const s_ = L - 0.0894841775 * aa - 1.291485548 * bb;
          const rl = l_ * l_ * l_;
          const gl = m_ * m_ * m_;
          const bl = s_ * s_ * s_;
          const enc = (v: number): number => {
            const c = Math.min(1, Math.max(0, v));
            return Math.round(
              255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055),
            );
          };
          const r8 = enc(4.0767416621 * rl - 3.3077115913 * gl + 0.2309699292 * bl);
          const g8 = enc(-1.2684380046 * rl + 2.6097574011 * gl - 0.3413193965 * bl);
          const b8 = enc(-0.0041960863 * rl - 0.7034186147 * gl + 1.707614701 * bl);
          // Cross-check against the engine once per conversion: the canvas
          // read of the same string is the renderer's own answer, 8-bit
          // quantized. The slack is alpha-scaled — canvas storage is
          // premultiplied, so at alpha a one storage count reconstructs to
          // ~1/a channel counts (observed on WebKit, 2026-09-12: an
          // oklab(... / 0.1) failed a flat one-count tolerance while the
          // transform was exact). A wrong coefficient shifts a colour by
          // far more than that bound, so a disagreement is still recorded
          // as a defect, not absorbed as a fallback.
          const slack = Math.max(1, Math.ceil(1 / alpha));
          _ctx.clearRect(0, 0, 1, 1);
          _ctx.fillStyle = s;
          _ctx.fillRect(0, 0, 1, 1);
          const [er = 0, eg = 0, eb = 0, ealpha = 0] = _ctx.getImageData(0, 0, 1, 1).data;
          if (
            ealpha === 0 ||
            Math.abs(er - r8) > slack ||
            Math.abs(eg - g8) > slack ||
            Math.abs(eb - b8) > slack
          ) {
            transformMismatches.push(s);
          }
          return { r: r8, g: g8, b: b8, a: alpha };
        }
        // A malformed oklab falls through to the canvas below, which still
        // counts it — fail-closed.
      }
      // Slow path: any other format (oklch, named colour, hsl…).
      // Draw one pixel and read it back — the browser does the conversion.
      _ctx.clearRect(0, 0, 1, 1);
      _ctx.fillStyle = s;
      _ctx.fillRect(0, 0, 1, 1);
      const [r = 0, g = 0, b = 0, alpha = 0] = _ctx.getImageData(0, 0, 1, 1).data;
      if (alpha === 0) return null;
      canvasConversions += 1;
      canvasConverted.push(s);
      return { r, g, b, a: alpha / 255 };
    }

    // An SVG's graphical object paint comes from the inner elements that
    // actually carry fill or stroke attributes — not the <svg> root, whose
    // computed fill defaults to black when no attribute is present. A
    // lucide icon sets fill="none" stroke="currentColor" on the <svg>
    // itself, and that is measured correctly; but WindowControls' inline
    // SVGs set fill="currentColor" on <rect> and stroke="currentColor"
    // on <path> children, leaving the root at its default.
    //
    // The fix: walk every child with an explicit fill or stroke attribute
    // and measure its computed paint, then measure the <svg> root's own
    // fill/stroke if it carries either attribute. Deduplicate by colour
    // so the same paint is not measured twice.
    function paintsOf(svg: Element): { r: number; g: number; b: number; a: number }[] {
      const seen = new Set<string>();
      const paints: { r: number; g: number; b: number; a: number }[] = [];

      // Only measure a paint property when the element carries an explicit
      // attribute for it. Without one, the computed value is the SVG default
      // (black for fill, none for stroke) — not the colour the element
      // actually paints with.
      const collect = (el: Element, keys: readonly ("fill" | "stroke")[]) => {
        const c = getComputedStyle(el);
        for (const key of keys) {
          const val = c[key];
          if (val === "none" || val === "") continue;
          const color = toSRGB(val);
          if (!color || color.a === 0) continue;
          const k = `${key}:${String(color.r)},${String(color.g)},${String(color.b)},${color.a.toFixed(2)}`;
          if (seen.has(k)) continue;
          seen.add(k);
          paints.push(color);
        }
      };

      const rootKeys = (["fill", "stroke"] as const).filter((k) => svg.hasAttribute(k));
      if (rootKeys.length > 0) {
        collect(svg, rootKeys);
      }

      for (const child of svg.querySelectorAll("[fill],[stroke]")) {
        const childKeys = (["fill", "stroke"] as const).filter((k) => child.hasAttribute(k));
        collect(child, childKeys);
      }

      return paints;
    }

    function parseColor(str: string) {
      return toSRGB(str);
    }
    function linear(v: number) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    }
    function luminance(c: { r: number; g: number; b: number }) {
      return 0.2126 * linear(c.r) + 0.7152 * linear(c.g) + 0.0722 * linear(c.b);
    }
    function contrast(
      a: { r: number; g: number; b: number },
      b: { r: number; g: number; b: number },
    ) {
      const la = luminance(a);
      const lb = luminance(b);
      return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    }

    const root = document.documentElement;
    const ancestors = (el: Element): Element[] => {
      const chain: Element[] = [];
      let node = el.parentElement;
      while (node && node !== root) {
        chain.push(node);
        node = node.parentElement;
      }
      return chain;
    };
    const isExempt = (chain: Element[]) =>
      chain.some((node) => {
        const cls = node.getAttribute("class");
        return cls !== null && /disabled.opacity-50|opacity-50.disabled/.test(cls);
      });
    const sitsOnGradient = (chain: Element[]) =>
      chain.some((node) => {
        const image = getComputedStyle(node).backgroundImage;
        return image !== "none" && image !== "";
      });

    interface Failure {
      ratio: string;
      paint: string;
      background: string;
      svgClass: string;
    }
    const failures: Failure[] = [];
    let skipped = 0;

    for (const svg of document.querySelectorAll("svg")) {
      const computed = getComputedStyle(svg);
      if (computed.display === "none" || computed.visibility === "hidden") continue;

      const chain = ancestors(svg);
      if (isExempt(chain)) continue;
      if (sitsOnGradient(chain)) {
        skipped += 1;
        continue;
      }

      const paints = paintsOf(svg);
      if (paints.length === 0) continue;

      // Every ancestor's opacity wraps the whole subtree, so it multiplies
      // into the paint. The background is then composited from the root
      // down, each ancestor's colour blended in at its own effective alpha;
      // any alpha left over rests on the page's white ground.
      let paintAlpha = parseFloat(computed.opacity);
      for (const node of chain) paintAlpha *= parseFloat(getComputedStyle(node).opacity);
      if (paintAlpha === 0) continue;

      let canvas: { r: number; g: number; b: number; a: number } | null = null;
      for (const node of [...chain].reverse()) {
        const nodeComputed = getComputedStyle(node);
        const opacity = parseFloat(nodeComputed.opacity);
        const bg = parseColor(nodeComputed.backgroundColor);
        if (bg && bg.a > 0) {
          const a = bg.a * opacity;
          if (!canvas) canvas = { r: bg.r, g: bg.g, b: bg.b, a };
          else
            canvas = {
              r: bg.r * a + canvas.r * (1 - a),
              g: bg.g * a + canvas.g * (1 - a),
              b: bg.b * a + canvas.b * (1 - a),
              a: a + canvas.a * (1 - a),
            };
        }
      }
      canvas ??= { r: 255, g: 255, b: 255, a: 1 };
      if (canvas.a < 1) {
        canvas = {
          r: 255 * (1 - canvas.a) + canvas.r * canvas.a,
          g: 255 * (1 - canvas.a) + canvas.g * canvas.a,
          b: 255 * (1 - canvas.a) + canvas.b * canvas.a,
          a: 1,
        };
      }

      for (const paint of paints) {
        const p = { ...paint, a: paint.a * paintAlpha };
        const ratio = contrast(p, canvas);
        if (ratio < 3) {
          failures.push({
            ratio: ratio.toFixed(2),
            paint: `${String(p.r)},${String(p.g)},${String(p.b)} at alpha ${p.a.toFixed(2)}`,
            background: `${String(Math.round(canvas.r))},${String(Math.round(canvas.g))},${String(Math.round(canvas.b))}`,
            svgClass: (svg.getAttribute("class") ?? "").slice(0, 80),
          });
        }
      }
    }

    return { failures, skipped, canvasConversions, canvasConverted, transformMismatches };
  })();
};

// The reuse mode's dark pass sweeps the page reachDark already loaded and
// toggled — no second navigation, no addInitScript.
export async function sweepLoadedPage(browserPage: Page) {
  return timed("evaluate", () => browserPage.evaluate(sweepMeasureInPage));
}

// Tell VitePress which theme to start in. addInitScript runs after the
// page has an origin but before VitePress's inline script, so the
// localStorage key is set before first paint — Layout.vue's watchEffect
// then mirrors it onto `data-theme`, reproducing the same state a real
// user sees after toggling.
export async function sweepInTheme(browserPage: Page, target: string, theme: "light" | "dark") {
  await browserPage.addInitScript((t) => {
    localStorage.setItem("vitepress-theme-appearance", t);
  }, theme);
  await timed("goto", () => browserPage.goto(target));
  return sweepLoadedPage(browserPage);
}

type Sweep = Awaited<ReturnType<typeof sweepInTheme>>;

// The message carries the measurement, not just the failure: which svg,
// what it painted, what the composited background actually was, and the
// ratio between them — the same shape of report the accessibility suite
// builds for axe violations, so a red gate says what to fix.
export const sweepReport = (failures: Sweep["failures"]): string =>
  failures
    .map((f) => `${f.ratio}:1 — ${f.svgClass} painted ${f.paint} on ${f.background}`)
    .join("\n");

// The canvas fallback is the one place the sweep's numbers can silently
// change error profile: it loses precision on anything the rgb fast path
// would have parsed losslessly. Holding it at zero pins the sweep's
// precision story — a colour format the fast path cannot parse turns the
// gate red with the offending strings named, forcing the decision (extend
// the fast path, or accept the canvas precision deliberately) instead of
// letting the ratios drift.
export const canvasTripwire = (
  count: Sweep["canvasConversions"],
  converted: Sweep["canvasConverted"],
): string =>
  `the sweep's canvas fallback converted ${String(count)} colour(s) through the lossy canvas round-trip: ${converted.join(" | ")}. Every computed colour on the swept pages is expected to serialize as rgb/rgba or oklab, which the fast path parses exactly. Extend the fast path deliberately, or accept the canvas precision in a comment beside the assertion, before trusting these ratios again.`;

// A mismatch is a defect in the walk's Oklab→sRGB transform, not a theme
// defect: the cross-check compares the closed form against the engine's own
// resolution of the same string, which they may differ by at most the
// canvas's one-count quantization. A wrong coefficient would quietly shift
// every ratio computed from an oklab colour — fix the transform before
// trusting any of them.
export const transformMessage = (mismatches: Sweep["transformMismatches"]): string =>
  `the walk's Oklab→sRGB transform disagrees with the engine's own resolution of: ${mismatches.join(" | ")} — beyond the canvas's one-count quantization per channel. Fix the transform before trusting any ratio that touched these colours.`;

// ── target-size ───────────────────────────────────────────────────────────────────

export const measureInPage = () => {
  // Hoisted: `page.evaluate` serialises the function body, so every constant
  // the closure reads must live inside it — outer-scope values do not cross.
  return (() => {
    const MIN_SIZE = 24;

    // Selectors for interactive elements. `[role="button"]` catches elements
    // with ARIA button semantics that don't use `<button>` natively.
    const INTERACTIVE =
      'button, a[href], input, select, textarea, [role="button"], [role="tab"], [role="menuitem"], [role="option"], [role="switch"], [role="checkbox"], [role="radio"], [role="link"], [tabindex]:not([tabindex="-1"])';

    // Elements whose target size is decided by the browser, not the author.
    const UA_PROVIDED = new Set([
      "select",
      "input[type='range']",
      "input[type='color']",
      "input[type='datetime-local']",
      "input[type='date']",
      "input[type='time']",
    ]);

    // VitePress chrome — emitted by the documentation framework, not by Loom.
    // These elements are outside this repository's reach: the skip link,
    // the theme toggle, and the heading anchor links that VitePress injects.
    const VP_CHROME = new Set([".VPSkipLink", ".VPSwitch", ".header-anchor"]);

    // Date/time segment inputs — editable elements inside a segmented date or
    // time field (either `<div role="spinbutton">` or `<input>`). Each segment
    // (day, month, year, hour, minute) is a separate focusable region whose
    // width is set by its content (1–2 digits) and whose height is constrained
    // by the field's line-height, exactly as the WCAG 2.5.8 "inline" exception
    // describes: "Targets that are in sentences, or otherwise embedded in blocks
    // of text, are excluded because their size is constrained by the line height
    // of the surrounding text." A date segment *is* text inside a line, not an
    // independent control. Identified by the `tabular` utility class that
    // Loom's date/time pickers apply to every segment. The check does not
    // require `tabindex` because native `<input>` elements are focusable by
    // default and carry no explicit attribute — the class alone is the marker.
    const isDateSegment = (el: Element) => el.classList.contains("tabular");

    // Rating step buttons — each star (or half-star) in an interactive Rating
    // is a `<button role="radio">` clipped to the fraction it represents.
    // With `step: 0.5`, the left half of a star is a button roughly 12×24px
    // and the right half is the same. The two halves together are one whole
    // star whose target meets the floor; neither half has a separate
    // equivalent elsewhere. This is the same principle as a segmented date
    // field: sub-targets within a composite widget whose combined target is
    // sufficient. Identified by the `group/step` class Loom's Rating applies.
    const isRatingStep = (el: Element) => [...el.classList].some((c) => c.startsWith("group/"));

    interface Finding {
      tag: string;
      selector: string;
      width: number;
      height: number;
    }
    const findings: Finding[] = [];

    for (const el of document.querySelectorAll<HTMLElement>(INTERACTIVE)) {
      // Hidden elements are not targets.
      if (el.offsetParent === null) continue;

      // Invisible elements — zero or single-pixel dimension, or transparent —
      // are not real pointer targets. Reka UI's hidden form-submission inputs
      // use a variety of hiding techniques: some are 1×1px with clip (sr-only),
      // some are 0×N or N×0 spacers, and some are full-height but `opacity: 0`.
      // No reader can aim at any of these.
      {
        const early = el.getBoundingClientRect();
        if (early.width <= 1 || early.height <= 1) continue;
        if (parseFloat(getComputedStyle(el).opacity) === 0) continue;
      }

      // VitePress chrome exemption — not authored by Loom.
      if (VP_CHROME.size > 0 && [...el.classList].some((c) => VP_CHROME.has(`.${c}`))) continue;

      // Date segment exemption — inline targets constrained by the field's
      // line-height (WCAG 2.5.8 "inline" exception).
      if (isDateSegment(el)) continue;

      // Rating step exemption — sub-targets within a composite star widget
      // whose combined target meets the floor.
      if (isRatingStep(el)) continue;

      const computed = getComputedStyle(el);

      // Inline exception: a link or button that sits in flowing text and
      // inherits its box from the line. `inline-flex` and `inline-block`
      // carry their own box, so they are not exempt.
      if (computed.display === "inline") continue;

      // UA-provided exception: native controls whose size the browser decides.
      const tag = el.tagName.toLowerCase();
      const inputType = tag === "input" ? (el as HTMLInputElement).type : "";
      if (tag === "select") continue;
      if (tag === "input" && UA_PROVIDED.has(`input[type='${inputType}']`)) continue;

      // When a `<label>` wraps an interactive element, the label *is* the
      // click target — the indicator inside it is not a separate target. Skip
      // the inner element and measure the label instead.
      const label = el.closest("label");
      if (label?.contains(el)) {
        // Only measure the label once; skip its inner interactive child.
        if (el !== label.querySelector(INTERACTIVE)) continue;
        const box = label.getBoundingClientRect();
        if (box.width < MIN_SIZE || box.height < MIN_SIZE) {
          // el.className may be an SVGAnimatedString on SVG elements; coerce
          // to string only when it actually is one.
          const classStr = typeof el.className === "string" ? el.className : "";
          const firstClass = classStr.split(" ")[0] ?? "";
          findings.push({
            tag: "label",
            selector: label.id ? `label#${label.id}` : `label > .${firstClass}`,
            width: Math.round(box.width),
            height: Math.round(box.height),
          });
        }
        continue;
      }

      const box = el.getBoundingClientRect();
      if (box.width < MIN_SIZE || box.height < MIN_SIZE) {
        // Build a short, human-readable selector for the report.
        const id = el.id ? `#${el.id}` : "";
        const firstClass = typeof el.className === "string" ? el.className.split(" ")[0] : "";
        const cls = firstClass ? `.${firstClass}` : "";
        findings.push({
          tag: `${tag}${inputType ? `[type=${inputType}]` : ""}`,
          selector: `${tag}${id || cls}`,
          width: Math.round(box.width),
          height: Math.round(box.height),
        });
      }
    }

    return findings;
  })();
};

// ── keyboard ───────────────────────────────────────── Page is imported above ────

// One browser-side pass: find the tables that actually scroll, try to focus
// each, and report whether focus landed. Done here rather than as a loop of
// `locator.focus()` calls because the decision "does this one scroll" would
// otherwise be a conditional in the test body, which
// `playwright/no-conditional-in-test` rejects — and rightly, since a skipped
// iteration and a passing one look identical from the outside. Moved here so
// the B2 bench asks exactly the production question, and so the production
// test body stays a single call.
export const keyboardTableResults = (browserPage: Page) =>
  timed("evaluate", () =>
    browserPage.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>(".vp-doc table")]
        .map((table, index) => ({ table, index }))
        .filter(({ table }) => table.scrollWidth > table.clientWidth)
        .map(({ table, index }) => {
          table.focus({ preventScroll: true });
          return { index, focused: document.activeElement === table };
        }),
    ),
  );

// `preventScroll` is load-bearing, not cosmetic: plain focus() also scrolls
// the table into view, and on the shared page that scroll lands after the
// light passes have already proved the DOM. VitePress's outline marker
// carries the scroll-driven anchor state in its inline style, and on the
// reordered shared page that state changed across the dark toggle's
// premise-gate captures (measured: bench run 34682397107, first difference
// at the `.outline-marker` style, `top: 33px; opacity: 0` → `top: 391px;
// opacity: 1`). Focus is the only actor in the pre-toggle gate sequence
// that scrolls, so the fix removes the side effect instead of normalizing
// the marker. The check's question is whether focus LANDS — the tab-order
// question of WCAG 2.1.1 — and it lands identically without the scroll.

// The phone-width leg of the shared page, split in two so the bench can
// fingerprint the DOM between the halves: `enterPhoneWidth` resizes to
// 375×800 and returns the project viewport it displaced; `exitPhoneWidth`
// restores it. Kept beside `keyboardTableResults` so the production test body
// stays straight-line — a conditional restore in the test body is exactly the
// `playwright/no-conditional-in-test` finding the single-sourcing here exists
// to avoid. On a failed keyboard verdict the page stays at 375px, which is
// the layout the screenshot and trace should show.
export type Viewport = ReturnType<Page["viewportSize"]>;

export const enterPhoneWidth = async (browserPage: Page): Promise<Viewport> => {
  const saved = browserPage.viewportSize();
  await browserPage.setViewportSize({ width: 375, height: 800 });
  return saved;
};

export const exitPhoneWidth = async (browserPage: Page, saved: Viewport): Promise<void> => {
  if (saved !== null) await browserPage.setViewportSize(saved);
};

// ── the verdicts ─────────────────────────────────────────────────────────
//
// The production failure reports and their assertions, exported beside the
// checks so the specs and the B2 bench hold every check to the same verdict
// shape. Every message string is byte-identical to what the specs printed
// before the move; `scope` carries the per-pass prefix ("", "[light] ",
// "[dark] ") the reuse mode introduced.

export const targetReport = (findings: ReturnType<typeof measureInPage>): string =>
  findings
    .map((f) => `${f.tag} (${String(f.width)}×${String(f.height)}px) — ${f.selector}`)
    .join("\n");

export const assertTargetSizeResult = (
  findings: ReturnType<typeof measureInPage>,
  scope: string,
  minSize: number,
): void => {
  expect(
    findings,
    `${scope}targets below ${String(minSize)}px:\n${targetReport(findings)}`,
  ).toEqual([]);
};

export const assertRulesResult = (
  result: Awaited<ReturnType<typeof scanEffectiveRules>>,
  scope: string,
): void => {
  expect(result.violations, `${scope}${formatViolations(result.violations)}`).toEqual([]);
};

export const assertColorContrastResult = (
  result: Awaited<ReturnType<typeof scanColorContrast>>,
  scope: string,
): void => {
  expect(result.violations, `${scope}${formatViolations(result.violations)}`).toEqual([]);
};

export const assertSweepResult = (
  sweep: Awaited<ReturnType<typeof sweepLoadedPage>>,
  scope: string,
): void => {
  expect(sweep.failures, `${scope}${sweepReport(sweep.failures)}`).toEqual([]);
  expect(
    sweep.skipped,
    `${scope}svgs skipped on a gradient backdrop: ${String(sweep.skipped)}`,
  ).toBe(0);
  expect(
    sweep.canvasConversions,
    `${scope}${canvasTripwire(sweep.canvasConversions, sweep.canvasConverted)}`,
  ).toBe(0);
  expect(
    sweep.transformMismatches,
    `${scope}${transformMessage(sweep.transformMismatches)}`,
  ).toEqual([]);
};

export const keyboardReport = (unreachable: string[]): string =>
  `scrollable but not focusable:\n${unreachable.join("\n")}`;

export const assertKeyboardResult = (unreachable: string[], scope: string): void => {
  expect(unreachable, `${scope}${keyboardReport(unreachable)}`).toEqual([]);
};

/**
 * Gate-granularity failure aggregation for the page sweep (#384): run one
 * gate as its own `test.step` and, when it trips, record the gate name and
 * its message and carry on to the next gate — instead of first-trip-only.
 *
 * The try surrounds the `test.step` call, not the gate body: Playwright
 * marks a step failed when its callback throws, before the error reaches
 * this catch — so a tripped gate still shows red in the step list, while
 * the page's remaining gates still run and report.
 *
 * The green path is untouched: on a page that passes, `collectGate` is one
 * await of the step and the collector stays empty. The per-test timeout
 * still bounds the whole aggregation — a gate that hangs hits its step (or
 * test) timeout and the test fails there, exactly as first-trip-only would.
 */
export interface GateFailure {
  gate: string;
  message: string;
}

export const collectGate = async (
  failures: GateFailure[],
  gate: string,
  run: () => Promise<void>,
): Promise<void> => {
  try {
    await test.step(gate, run);
  } catch (error) {
    failures.push({ gate, message: error instanceof Error ? error.message : String(error) });
  }
};

/**
 * The one failure the test reports at its end: every tripped gate under its
 * step name, with the gate's own message body — the same
 * `formatViolations`/`sweepReport`/`targetReport`/`keyboardReport` bodies a
 * first-trip run printed, nothing reworded.
 */
export const gateReport = (failures: readonly GateFailure[]): string =>
  failures.map(({ gate, message }) => `— ${gate}\n${message}`).join("\n\n");
