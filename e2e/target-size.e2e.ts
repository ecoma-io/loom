import { test, expect } from "@playwright/test";
import { documentationPages } from "./docs-pages";

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

const measureInPage = () => {
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

for (const page of documentationPages()) {
  const label = page === "." ? "/" : `/${page}`;

  test(`${label} has no interactive target smaller than ${String(MIN_SIZE)}×${String(MIN_SIZE)}px (WCAG 2.5.8)`, async ({
    page: browserPage,
  }) => {
    await browserPage.goto(page);

    const findings = await browserPage.evaluate(measureInPage);

    const report = findings
      .map((f) => `${f.tag} (${String(f.width)}×${String(f.height)}px) — ${f.selector}`)
      .join("\n");

    expect(findings, `targets below ${String(MIN_SIZE)}px:\n${report}`).toEqual([]);
  });
}
