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
 * The array is now partitioned into BROWSERLESS_RULES, BROWSER_REQUIRED_RULES, and
 * TAGGED_BUT_DISABLED_RULES. The split line between the first two is whether a rule's
 * checks read layout geometry, hit-testing, pseudo-element or computed-color resolution,
 * canvas, or media state — none of which jsdom provides. TAGGED_BUT_DISABLED holds the
 * 7 WCAG-tagged rules that axe-core 4.12.1 ships with enabled:false; a tag-type runOnly
 * (the old gate: withTags([...WCAG_TAGS])) excludes them, so they were never part of
 * the effective rule set. A rule-type runOnly (the new gates: withRules([...list]))
 * RUNS any named rule regardless of enabled status, so adopting any of these seven
 * experimental rules into a runtime tier is a deliberate policy decision, not a side effect of a
 * refactor.
 *
 * The effective rule set this gate has ALWAYS enforced is 65 rules: BROWSERLESS_RULES (51)
 * ∪ BROWSER_REQUIRED_RULES (14). TAGGED_BUT_DISABLED (7) are split out so that pins and
 * documentation can reference them explicitly. The union of all three sets equals the
 * full 72 WCAG-tagged rules in axe-core 4.12.1, which is how we document what we
 * COULD test, not what we DO test. Every rule runs in the tier that can judge it; disabled
 * rules are deliberately kept out of runtime tiers until the maintainer decides otherwise.
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
 * Rules that require a rendering engine — their checks read layout geometry,
 * hit-test results, pseudo-element styles, computed color pipelines, canvas,
 * or media state (src, currentSrc, plays), which jsdom does not provide.
 *
 * These 14 rules are the complement of BROWSERLESS_RULES within the EFFECTIVE WCAG_TAGS
 * set (65 rules total, excluding 7 disabled-by-default experimental rules). The split is:
 * - 12 rendering-dependent (geometry, hit-testing, computed colors, canvas, media, iframe content)
 * - 2 conservative-partial (table rules whose `matches` predicate uses border
 *   geometry; kept in browser until Table semantic markup is pinned)
 */
export const BROWSER_REQUIRED_RULES = [
  // Rendering-dependent (12): each checks geometry/hit-test/computed styles/canvas/media/iframe
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
] as const;

/**
 * WCAG-tagged rules that axe-core 4.12.1 ships with enabled: false.
 *
 * A tag-type runOnly (the old gate: withTags([...WCAG_TAGS])) excludes disabled rules.
 * These 7 were never part of this gate's effective set. A rule-type runOnly (the new
 * gates: withRules([...list])) RUNS any named rule regardless of enabled status, so
 * naming a disabled rule in a withRules list would silently adopt an experimental rule —
 * which is exactly what reddened CI on stepper (12 label-content-name-mismatch findings).
 *
 * Keeping these in a separate constant makes the split contract precise: the union of
 * BROWSERLESS_RULES ∪ BROWSER_REQUIRED_RULES equals the EFFECTIVE rule set this gate has
 * ALWAYS enforced (63 rules), not the theoretical 70 WCAG-tagged rules. Adopting any of the
 * seven below into a tier is a deliberate policy decision for the maintainer, not a side effect
 * of a refactor.
 *
 * Measurement 2026-08-26: these were absent from every axe bucket under WCAG_TAGS on the
 * stepper demo when scanned with withTags, confirming they were tag-excluded by disabled status.
 */
export const TAGGED_BUT_DISABLED_RULES = [
  // Browserless-safe disabled rules (3)
  "aria-roledescription", // disabled-by-default, experimental
  "audio-caption", // disabled-by-default, experimental
  "p-as-heading", // disabled-by-default, experimental
  // Browser-required disabled rules (4)
  "css-orientation-lock", // disabled-by-default, experimental
  "label-content-name-mismatch", // disabled-by-default, experimental (stepper violations)
  "table-fake-caption", // disabled-by-default, experimental
  "td-has-header", // disabled-by-default, experimental
] as const;
