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
 */
export const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] as const;
