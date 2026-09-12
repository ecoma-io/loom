import { test, expect } from "@playwright/test";
import { documentationPages } from "./docs-pages";
import { REUSE_THEME, reachDark } from "./theme";
import {
  canvasTripwire,
  sweepInTheme,
  sweepLoadedPage,
  sweepReport,
  transformMessage,
} from "./checks";

// One rendered-SVG contrast sweep per page, at WCAG 1.4.11's 3:1 floor for
// graphical objects. Two real defects hid behind the same pair of gaps, and
// this check exists because both did:
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
// Both sweeps ride one test per page when `LOOM_E2E_REUSE_THEME=1` (see
// e2e/theme.ts): the light pass sweeps, then the dark pass reaches dark on
// the loaded page through VitePress's own toggle and sweeps again. Unset —
// the default — each theme still navigates on its own, byte-for-byte as
// before.
for (const page of documentationPages()) {
  const label = page === "." ? "/" : `/${page}`;

  if (!REUSE_THEME) {
    for (const theme of ["light", "dark"] as const) {
      test(`${label} (${theme}) draws every SVG graphical object at WCAG 1.4.11's 3:1 floor`, async ({
        page: browserPage,
      }) => {
        const { failures, skipped, canvasConversions, canvasConverted, transformMismatches } =
          await sweepInTheme(browserPage, page, theme);
        expect(failures, sweepReport(failures)).toEqual([]);

        // Nothing silently escapes the sweep. A gradient backdrop has no single
        // ratio, so the elements on one are counted rather than ignored.
        expect(skipped, `svgs skipped on a gradient backdrop: ${String(skipped)}`).toBe(0);

        // And nothing silently changes the precision the verdicts rest on.
        expect(canvasConversions, canvasTripwire(canvasConversions, canvasConverted)).toBe(0);
        expect(transformMismatches, transformMessage(transformMismatches)).toEqual([]);
      });
    }

    continue;
  }

  test(`${label} draws every SVG graphical object at WCAG 1.4.11's 3:1 floor in either theme`, async ({
    page: browserPage,
  }) => {
    await test.step("light", async () => {
      const { failures, skipped, canvasConversions, canvasConverted, transformMismatches } =
        await sweepInTheme(browserPage, page, "light");
      expect(failures, `[light] ${sweepReport(failures)}`).toEqual([]);
      expect(skipped, `[light] svgs skipped on a gradient backdrop: ${String(skipped)}`).toBe(0);
      expect(
        canvasConversions,
        `[light] ${canvasTripwire(canvasConversions, canvasConverted)}`,
      ).toBe(0);
      expect(transformMismatches, `[light] ${transformMessage(transformMismatches)}`).toEqual([]);
    });

    await test.step("dark", async () => {
      // The dark pass rides the same loaded page: reach dark through
      // VitePress's own toggle — reachDark also asserts the DOM-identity
      // premise the collapse both modes share — then sweep it again.
      await reachDark(browserPage, page, label);
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
  });
}
