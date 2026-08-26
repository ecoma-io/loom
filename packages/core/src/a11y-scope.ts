/**
 * The WCAG scope Loom holds itself to: the assistive-technology and keyboard
 * rules, not axe's SEO and document-structure best-practice set. A component
 * library cannot know what document it will be rendered into, so a rule about
 * the document is the consumer's to answer, not ours.
 *
 * Single source for every axe run against this package, and there is more
 * than one, in different processes: the documentation site's live
 * accessibility panel and the end-to-end gate that scans the built site. Both
 * import this. The list must never be restated, or the panel a contributor
 * reads and the gate that blocks the merge drift into disagreeing about what
 * counts as a violation.
 *
 * Exported from the narrow `@ecoma-io/loom/a11y` entry so a tool that only
 * needs this array — a Playwright run, a CI script — can read it without
 * pulling in a single Vue component.
 *
 * The array is partitioned into BROWSERLESS_RULES, BROWSER_REQUIRED_RULES, and
 * TAGGED_BUT_DISABLED_RULES. The split line between the first two is whether a rule's
 * checks read layout geometry, hit-testing, pseudo-element or computed-color resolution,
 * cascade-dependent font metrics, canvas, or media state — none of which the jsdom demo
 * tier provides. TAGGED_BUT_DISABLED holds the WCAG-tagged rules that axe-core 4.12.1
 * ships with enabled:false; a tag-type runOnly (the old gate: withTags([...WCAG_TAGS]))
 * excludes them, so they were never part of the tag-selected rule set. A rule-type
 * runOnly (the gates that consume these lists: withRules([...list])) RUNS any named
 * rule regardless of enabled status.
 *
 * Loom's bar is that a rule mapping to a Level A or AA success criterion stays out of
 * the runtime tiers only when it is SUPERSEDED (another rule in the tiers already
 * judges the same criterion) or OUT-OF-REACH (the criterion needs something this
 * repository cannot supply) — "axe ships it disabled" is not a reason. The partition
 * below is the result of that review, 2026-08-26: of the 7 disabled rules, 5 were
 * adopted (aria-roledescription browserless; label-content-name-mismatch, p-as-heading,
 * table-fake-caption and td-has-header browser-required — the findings on loom's own
 * markup were fixed in the same change) and 2 remain out, each with its criterion and
 * its reason written below.
 *
 * The runtime tiers hold 68 of the 70 WCAG-tagged rules: BROWSERLESS_RULES (51) ∪
 * BROWSER_REQUIRED_RULES (17). The union of all three sets equals the full 70, which
 * is pinned by packages/core/tests/a11y-scope.test.ts.
 */
export const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] as const;

/**
 * Rules that can be judged in jsdom — semantic checks that read only the DOM,
 * attributes, and cascade (no layout geometry, hit-testing, pseudo-elements,
 * computed colors, canvas, or media state).
 *
 * These 51 rules are verified to produce identical verdicts in jsdom 30 and
 * Chromium on violation fixtures, and to agree on all 94 demos. Each entry
 * was classified by scanning its check helpers for browser-API dependencies;
 * the partition is pinned by packages/core/tests/a11y-scope.test.ts.
 */
export const BROWSERLESS_RULES = [
  "area-alt",
  "aria-allowed-attr",
  "aria-braille-equivalent",
  "aria-command-name",
  "aria-conditional-attr",
  "aria-deprecated-role",
  "aria-hidden-body",
  "aria-input-field-name",
  "aria-meter-name",
  "aria-progressbar-name",
  "aria-prohibited-attr",
  "aria-required-attr",
  "aria-required-children",
  "aria-required-parent",
  // Adopted 2026-08-26 from TAGGED_BUT_DISABLED. Deprecated by axe-core
  // 4.7.0 with NO successor — the axe-core change that deprecated it states
  // there is no other rule testing aria-roledescription usage — so WCAG 4.1.2
  // (Level A) had nothing judging it.
  // The check reads only the element's role (axe commons getRole), no
  // browser API: identical verdicts measured jsdom vs Chromium on five
  // fixtures including two violations (aria-roledescription on a roleless
  // div, and on role="presentation"), and clean on all 94 demos in both
  // engines. Loom ships this attribute through Reka (NumberField's
  // spinbutton, ColorPicker's slider surfaces) — all on roled elements,
  // which the rule passes.
  "aria-roledescription",
  "aria-roles",
  "aria-tab-name",
  "aria-toggle-field-name",
  "aria-tooltip-name",
  "aria-valid-attr",
  "aria-valid-attr-value",
  "autocomplete-valid",
  "blink",
  "button-name",
  "definition-list",
  "dlitem",
  "document-title",
  "duplicate-id-aria",
  "form-field-multiple-labels",
  "frame-title",
  "frame-title-unique",
  "html-has-lang",
  "html-lang-valid",
  "html-xml-lang-mismatch",
  "image-alt",
  "input-button-name",
  "input-image-alt",
  "label",
  "link-name",
  "list",
  "listitem",
  "meta-refresh",
  "meta-viewport",
  "nested-interactive",
  "role-img-alt",
  "select-name",
  "server-side-image-map",
  "summary-name",
  "svg-img-alt",
  "valid-lang",
  "video-caption",
] as const;

/**
 * Rules that require a rendering engine — their checks (or, for the table
 * rules, their `matches` predicate) read layout geometry, hit-test results,
 * pseudo-element styles, computed color pipelines, cascade-dependent font
 * metrics, canvas, or media state (src, currentSrc, plays), which jsdom does
 * not provide — or which the jsdom demo tier cannot judge because it mounts
 * demos with no stylesheet loaded.
 *
 * These 17 rules are what the browser gates run. The split is:
 * - 11 rendering-dependent (geometry, hit-testing, computed colors, canvas, media, iframe content)
 * - 2 conservative-partial (table rules whose `matches` predicate uses border
 *   geometry; kept in browser until Table semantic markup is pinned)
 * - 4 adopted 2026-08-26 from TAGGED_BUT_DISABLED (see their own comments)
 */
export const BROWSER_REQUIRED_RULES = [
  // Rendering-dependent (11): each checks geometry/hit-test/computed styles/canvas/media/iframe
  "aria-hidden-focus", // isModalOpen → elementsFromPoint, cantTell in jsdom
  "avoid-inline-spacing", // letter-spacing unresolved + Range.getClientRects gate → false-pass
  "bypass", // same modal-open throw; also pageLevel (page-scoped, wrong in component harness)
  "color-contrast", // computed color pipeline — jsdom cantTell on every node
  "frame-focusable-content", // iframe content inspection — requires browser to load frame
  "link-in-text-block", // innerText + color + rects
  "marquee", // jsdom default overflow:hidden + zero rect → false-pass
  "no-autoplay-audio", // currentSrc empty → never runs
  "object-alt", // matches throws on getClientRects
  "scrollable-region-focusable", // content-vs-container rects zero → never matches, silent false-pass
  "target-size", // zero rects read compliant — silent false-pass on real violations
  // Conservative-partial (2): table rules using border geometry; jsdom skips border-only tables
  "td-headers-attr", // border heuristic (offsetWidth !== clientHeight)
  "th-has-data-cells", // same border heuristic
  // Adopted 2026-08-26 (4), each with the measured reason jsdom cannot judge it:
  "label-content-name-mismatch", // WCAG 2.5.3 (A). Measured: 12 violations on
  // the stepper demo in Chromium, incomplete in jsdom — the visible-text half
  // of the check reads on-screen geometry (axe's hiddenMethods: opacity, clip,
  // coords) and icon-ligature detection needs a 2d canvas context, which jsdom
  // returns null without the `canvas` package. Its stepper/app-header findings
  // were fixed in the same change as this adoption.
  "p-as-heading", // WCAG 1.3.1 (A). The check reads computed font-weight/-size/
  // font-style; the jsdom demo tier mounts demos with no stylesheet, so
  // class-styled emphasis reads as default weight there — the card/empty-state
  // findings existed only in Chromium. Theme-invariant (font metrics do not
  // depend on data-theme), so the dark pass gains nothing from re-running it.
  "table-fake-caption", // WCAG 1.3.1 (A). The check itself is DOM-only (toGrid),
  // but data-table-matches → isDataTable classifies border-only tables through
  // offsetWidth/clientWidth geometry. Measured: a border-only table whose
  // first row is one colspanning cell violates in Chromium and never matches
  // in jsdom — same conservative-partial profile as td-headers-attr above.
  "td-has-header", // WCAG 1.3.1 (A). Same isDataTable dependency. Measured:
  // a 3x3 border-only table violates in Chromium and never matches in jsdom —
  // a silent false-pass if this were browserless.
] as const;

/**
 * WCAG-tagged rules that axe-core 4.12.1 ships with enabled: false and that
 * stay OUT of the runtime tiers — each with its success criterion and the
 * OUT-OF-REACH reason, per the review of 2026-08-26. A disabled rule may only
 * sit here if the criterion needs something this repository cannot supply;
 * "axe ships it disabled" is not a reason, and neither is a finding on loom's
 * own markup (that gets fixed and the rule adopted — the other five disabled
 * rules went exactly that way).
 *
 * Naming one of these in a rule-type runOnly would run it anyway (enabled
 * status does not gate withRules), which is why they live in their own list
 * rather than being deleted: the union pin in packages/core/tests/
 * a11y-scope.test.ts keeps the 70-rule partition exact, and a future
 * component that reaches one of these criteria re-adjudicates here.
 */
export const TAGGED_BUT_DISABLED_RULES = [
  // WCAG 1.2.1 (Audio-only and Video-only, Level A). OUT-OF-REACH: the
  // criterion needs real audio media — loom ships no <audio> element in any
  // component, demo or docs page (zero grep hits in packages/ and docs/),
  // and a component library supplies structure, not media. Even if one
  // appeared, this rule could never redden a gate: its caption check
  // (axe-core 4.12.1 source) returns false when a captions track exists and
  // void 0 otherwise — pass or incomplete, never a violation. axe-core
  // deprecated it in 3.1.0 because WebVTT caption tracks on <audio> do not
  // function in any browser ("Audio captions do not work", per the
  // deprecation change itself); the text alternative 1.2.1 actually asks for
  // is host content, not markup.
  "audio-caption",
  // WCAG 1.3.4 (Orientation, Level AA). OUT-OF-REACH: the criterion needs an
  // orientation-locked app shell — CSS orientation media queries with fixed
  // extents, or the Screen Orientation API — and loom ships neither in any
  // component, demo, docs page or the harness's own stylesheet (zero grep
  // hits; theme.css is orientation-agnostic by design, tokens not layout).
  // Locking orientation is the host application's decision; measured 2026-08-26
  // the rule passes every one of the 94 demos in Chromium, where it reads the
  // preloaded CSSOM jsdom does not provide.
  "css-orientation-lock",
] as const;
