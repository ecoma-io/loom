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
 * The array is now partitioned into BROWSERLESS_RULES and BROWSER_REQUIRED_RULES,
 * read by the browserless semantic tier (docs/demos-a11y.test.ts) and the browser
 * residual tier (playwright harness gate), respectively. The split line is
 * whether a rule's checks read layout geometry, hit-testing, pseudo-element or
 * computed-color resolution, canvas, or media state — none of which jsdom provides.
 *
 * This is a SPLIT, not an exclusion: the union of the two lists is exactly the rule
 * set WCAG_TAGS selects in axe-core 4.12.1 (including disabled-by-default rules that
 * tag-selection runs anyway, e.g. target-size). Every rule still runs, in the tier
 * that can judge it.
 */
export const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] as const;

/**
 * Rules that can be judged in jsdom — semantic checks that read only the DOM,
 * attributes, and cascade (no layout geometry, hit-testing, pseudo-elements,
 * computed colors, canvas, or media state).
 *
 * These 53 rules are verified to produce identical verdicts in jsdom 30 and
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
  "aria-roledescription",
  "aria-roles",
  "aria-tab-name",
  "aria-toggle-field-name",
  "aria-tooltip-name",
  "aria-valid-attr",
  "aria-valid-attr-value",
  "audio-caption",
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
  "p-as-heading",
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
 * These 17 rules are the complement of BROWSERLESS_RULES within the WCAG_TAGS set:
 * - 12 rendering-dependent (geometry, hit-testing, computed colors, canvas, media)
 * - 5 conservative-partial (table rules whose `matches` predicate uses border
 *   geometry; kept in browser until Table semantic markup is pinned)
 */
export const BROWSER_REQUIRED_RULES = [
  // Rendering-dependent (12): each checks geometry/hit-test/computed styles/canvas/media
  "aria-hidden-focus", // isModalOpen → elementsFromPoint, cantTell in jsdom
  "avoid-inline-spacing", // letter-spacing unresolved + Range.getClientRects gate → false-pass
  "bypass", // same modal-open throw; also pageLevel (page-scoped, wrong in component harness)
  "color-contrast", // computed color pipeline — jsdom cantTell on every node
  "css-orientation-lock", // computed transform never resolves
  "label-content-name-mismatch", // canvas-dependent icon-ligature check throws
  "link-in-text-block", // innerText + color + rects
  "marquee", // jsdom default overflow:hidden + zero rect → false-pass
  "no-autoplay-audio", // currentSrc empty → never runs
  "object-alt", // matches throws on getClientRects
  "scrollable-region-focusable", // content-vs-container rects zero → never matches, silent false-pass
  "target-size", // zero rects read compliant — silent false-pass on real violations
  // Conservative-partial (5): table rules using border geometry; jsdom skips border-only tables
  "frame-focusable-content", // safe logic, but jsdom iframes are blank (no loading)
  "table-fake-caption", // matches predicate uses border heuristic (offsetWidth !== clientHeight)
  "td-has-header", // same border heuristic
  "td-headers-attr", // same border heuristic
  "th-has-data-cells", // same border heuristic
] as const;
