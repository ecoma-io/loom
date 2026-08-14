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
