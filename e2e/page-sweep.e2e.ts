import { test, expect } from "@playwright/test";
import { documentationPages } from "./docs-pages";
import { timed } from "../playwright/timings";
import { reachDark } from "./theme";
import {
  canvasTripwire,
  collectGate,
  enterPhoneWidth,
  exitPhoneWidth,
  formatViolations,
  gateReport,
  keyboardReport,
  keyboardTableResults,
  loadInLight,
  measureInPage,
  scanColorContrast,
  scanEffectiveRules,
  sweepLoadedPage,
  sweepReport,
  targetReport,
  transformMessage,
  type GateFailure,
} from "./checks";

// One loaded documentation page carries all four page-level gates — the
// effective WCAG rule set, the rendered-SVG contrast sweep, the 2.5.8
// target-size floor, and the phone-width keyboard reachability of every
// scrollable table — light first, then the keyboard gate at 375px on the
// same light page, then dark. The four gates used to be four spec groups of
// one navigation each (accessibility / contrast / target-size / keyboard);
// merging them is the B6 lever in perf/e2e-acceleration-model.md, measured
// before it shipped: on the desktop rows, navigations 4 → 1 per page and
// 288 of 288 (page, check) result payloads joined between the old shape and
// this one are byte-identical (e2e/b2-shared-page.e2e.ts, the bench that
// decided it; run IDs recorded in §2 B6). On the mobile profile rows the
// appearance toggle is unreachable below 1280px, so `reachDark`'s designed
// fallback pays a second, dark navigation — 4 → 2 there, still one gate
// sequence per load. The checks below are the same single-sourced bodies
// from e2e/checks.ts that bench ran all along.
//
// The merge's recorded cost was failure granularity — a page failing two
// gates reported only the first. The gates now aggregate (#384): each gate
// runs to its own verdict and a tripped gate neither stops the page's
// remaining gates nor hides the ones before it. The test fails once, at its
// end, with every tripped gate under its step name and its own message
// body — the same bodies a first-trip run printed. The green path is
// unchanged: same steps, same assertions, same order, and the closing
// aggregate assert is empty on green.
//
// ── the four gates, and why each looks the way it does ───────────────────────
//
// The WCAG gate is one `axe-core` run per rendered page, scoped to the
// effective rule set the library holds itself to (`BROWSERLESS_RULES ∪
// BROWSER_REQUIRED_RULES`, imported rather than restated — see a11y-scope's
// docblock for why the partition has exactly one home). The page list itself
// is read off `docs/` at definition time through `documentationPages()`, so a
// page added tomorrow is swept without anyone remembering to list it here.
// Loom's dark tokens are a symmetric set (not overrides), so both themes must
// pass independently — a contrast ratio that clears the floor in light mode
// is not guaranteed to do so in dark, and vice versa. The dark pass rides the
// same loaded page: dark is reached through VitePress's own toggle —
// `reachDark` also asserts the DOM-identity premise the collapse rests on —
// and re-runs only the color-dependent rules against the DOM the light pass
// proved.
//
// The contrast gate is one rendered-SVG sweep per page, at WCAG 1.4.11's 3:1
// floor for graphical objects. Two real defects hid behind the same pair of
// gaps, and this check exists because both did:
//
// - SVG paths are not text runs. axe's `color-contrast` rule measures text
//   and nothing else, so a stroke or fill that falls below the floor is
//   invisible to the accessibility suite no matter how broken it gets.
// - A disabled element is never evaluated at all. Dimming an unavailable
//   control with an opacity alpha is the idiomatic way to paint it, and it
//   is exactly what took Rating's stars from 7.53:1 to 2.36:1 (#29) and
//   Slider's filled range from 7.53:1 to ~2.3:1 (#40) — both below the 3:1
//   floor, both silent.
//
// So every page is swept by hand: each `<svg>` is measured against the
// background its ancestor chain actually composits over, and the ratio must
// meet the floor. The same walk is exact for this site because no element
// in it sits on a gradient — where one eventually does, a gradient has no
// single ratio to measure against, and that element is reported as skipped
// rather than guessed at.
//
// The one exemption is narrow and pinned. `disabled:opacity-50` on an
// ancestor exempts that SVG subtree — the Checkbox check, Pagination's edge
// chevrons, Editable's trigger and FileUpload's remove icon, each a
// decorative glyph whose function its button carries in an `aria-label`
// while the control is an inactive UI component, which 1.4.11 excepts. The
// signature matches only a class token carrying both words, and every
// component that owns one of those tokens asserts it verbatim in its own
// unit tests — so a data-bearing glyph can never borrow the exemption
// without the class-level pin failing first.
//
// The target-size gate is WCAG 2.2 SC 2.5.8: interactive elements must have
// a click/tap target of at least 24×24 CSS pixels. Three exceptions apply:
//
// 1. **Inline** — a link or button inside a line of text, sized to match the
//    surrounding text, is exempt. These are identified by `display: inline`
//    (not `inline-flex`, `inline-grid`, or `inline-block` which carry their
//    own box).
// 2. **User-agent provided** — native browser controls like `<select>`
//    dropdowns and `<input type="range">` sliders ship at UA-chosen sizes.
// 3. **Equivalent** — if a smaller target has a larger equivalent elsewhere
//    (e.g. a tiny icon button with a keyboard shortcut), it is exempt.
//
// The sweep checks every interactive element on each documentation page and
// reports those that fall below the floor, excluding inline text links and
// native UA controls. A wrapped label (Checkbox, Radio, Switch) counts as
// the whole label area — the click target is the `<label>`, not the 16×16px
// indicator inside it.
//
// The keyboard gate is the phone-width reachability guarantee. The width is
// the reason it exists: every table on this site is a scroll container —
// VitePress styles `.vp-doc table` as `display: block; overflow-x: auto` —
// and whether one actually scrolls is a property of the viewport, not of the
// table: measured across the built site, the tables that scroll at 1280px
// are a small minority of the tables that scroll at 375px. A desktop-only
// check therefore reports a site-wide keyboard defect as one stray page,
// which is exactly what it did before this test existed.
//
// Focusability is asserted rather than a full Tab walk. Tabbing to every
// table on every page would spend minutes proving what the browser decides
// in one question — whether the element is in the tab order at all — and
// that question is the whole of WCAG 2.1.1 here. The failure this guards
// against is an element that no key press can reach, not one that is reached
// late.
//
// WebKit is the browser this gate speaks for, and running it on Chromium
// alone would be worse than not running it: Chromium now makes a scroll
// container keyboard-focusable on its own, so `focus()` lands on an
// unfocusable table there and the check passes with the defect fully
// present. Verified by removing the `tabindex` and rerunning — green on
// Chromium, and eight named token tables on WebKit. `axe` says as much in
// its own rule text ("accessible by keyboard in Safari"). Keep every project
// in `playwright.config.ts`; narrowing the suite to Chromium would silently
// retire the check. The shared page reaches 375px by resizing mid-page, on
// the light theme, before the dark pass — the same theme a fresh native-375
// page reads, with fonts already loaded from the desktop pass. The bench
// joins the resize path's verdicts against that fresh baseline on every
// engine, WebKit included (§2 B6).
const MIN_SIZE = 24;

for (const page of documentationPages()) {
  const label = page === "." ? "/" : `/${page}`;

  test(`${label} passes every page-level gate in both themes`, async ({ page: browserPage }) => {
    await loadInLight(browserPage, page);

    const tripped: GateFailure[] = [];
    const gate = (name: string, run: () => Promise<void>): Promise<void> =>
      collectGate(tripped, name, run);

    await gate("light: no violations against Loom's effective WCAG rule set", async () => {
      const { violations } = await timed("axe-analyze", () => scanEffectiveRules(browserPage));
      expect(violations, `[light] ${formatViolations(violations)}`).toEqual([]);
    });

    await gate("light: every SVG graphical object at WCAG 1.4.11's 3:1 floor", async () => {
      const { failures, skipped, canvasConversions, canvasConverted, transformMismatches } =
        await sweepLoadedPage(browserPage);
      expect(failures, `[light] ${sweepReport(failures)}`).toEqual([]);
      expect(skipped, `[light] svgs skipped on a gradient backdrop: ${String(skipped)}`).toBe(0);
      expect(
        canvasConversions,
        `[light] ${canvasTripwire(canvasConversions, canvasConverted)}`,
      ).toBe(0);
      expect(transformMismatches, `[light] ${transformMessage(transformMismatches)}`).toEqual([]);
    });

    await gate(
      `light: no interactive target smaller than ${String(MIN_SIZE)}×${String(MIN_SIZE)}px (WCAG 2.5.8)`,
      async () => {
        const findings = await timed("evaluate", () => browserPage.evaluate(measureInPage));
        expect(findings, `targets below ${String(MIN_SIZE)}px:\n${targetReport(findings)}`).toEqual(
          [],
        );
      },
    );

    await gate("375px: no scrollable table unreachable by keyboard", async () => {
      // Mid-page, on the light theme the fresh baseline reads: the resize is
      // the only state it changes, and the project's own viewport comes back
      // before the dark pass — that is the viewport `reachDark` keys on (the
      // desktop navbar toggle lives at ≥1280px; below it, the mobile fallback
      // navigation). The `finally` restores the project viewport even when
      // this gate trips — the dark gates below still run under the
      // aggregation, and they read the project viewport, not 375px.
      const projectViewport = await enterPhoneWidth(browserPage);
      try {
        const results = await keyboardTableResults(browserPage);
        const unreachable = results
          .filter((result) => !result.focused)
          .map((result) => `table[${String(result.index)}]`);
        expect(unreachable, keyboardReport(unreachable)).toEqual([]);
      } finally {
        await exitPhoneWidth(browserPage, projectViewport);
      }
    });

    await gate("dark: no violations against color-dependent WCAG rules", async () => {
      await reachDark(browserPage, page, label);
      const { violations } = await timed("axe-analyze", () => scanColorContrast(browserPage));
      expect(violations, `[dark] ${formatViolations(violations)}`).toEqual([]);
    });

    await gate("dark: every SVG graphical object at WCAG 1.4.11's 3:1 floor", async () => {
      const { failures, skipped, canvasConversions, canvasConverted, transformMismatches } =
        await sweepLoadedPage(browserPage);
      expect(failures, `[dark] ${sweepReport(failures)}`).toEqual([]);
      expect(skipped, `[dark] svgs skipped on a gradient backdrop: ${String(skipped)}`).toBe(0);
      expect(
        canvasConversions,
        `[dark] ${canvasTripwire(canvasConversions, canvasConverted)}`,
      ).toBe(0);
      expect(transformMismatches, `[dark] ${transformMessage(transformMismatches)}`).toEqual([]);
    });

    // The page's one failure: every gate that tripped above, under its step
    // name, with its own message body. Empty on green — so the green path is
    // byte-for-byte what it was, and a tripped gate neither stops the page's
    // remaining gates nor hides the ones before it.
    expect(tripped, gateReport(tripped)).toEqual([]);
  });
}
