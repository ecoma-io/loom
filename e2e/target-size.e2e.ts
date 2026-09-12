import { test, expect } from "@playwright/test";
import { documentationPages } from "./docs-pages";
import { timed } from "../playwright/timings";
import { measureInPage, targetReport } from "./checks";

// WCAG 2.2 SC 2.5.8 Target Size (Minimum): interactive elements must have a
// click/tap target of at least 24×24 CSS pixels. Three exceptions apply:
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
// The sweep below checks every interactive element on each documentation page
// and reports those that fall below the floor, excluding inline text links and
// native UA controls. A wrapped label (Checkbox, Radio, Switch) counts as the
// whole label area — the click target is the `<label>`, not the 16×16px
// indicator inside it.

const MIN_SIZE = 24;

for (const page of documentationPages()) {
  const label = page === "." ? "/" : `/${page}`;

  test(`${label} has no interactive target smaller than ${String(MIN_SIZE)}×${String(MIN_SIZE)}px (WCAG 2.5.8)`, async ({
    page: browserPage,
  }) => {
    await timed("goto", () => browserPage.goto(page));

    const findings = await timed("evaluate", () => browserPage.evaluate(measureInPage));

    expect(findings, `targets below ${String(MIN_SIZE)}px:\n${targetReport(findings)}`).toEqual([]);
  });
}
