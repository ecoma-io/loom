// The `@ecoma-io/loom/a11y` entry.
//
// It exists because the main entry re-exports every component, which makes it
// unresolvable for a consumer that is not compiling Vue single-file components
// at all — an end-to-end test runner, a CI script. Those consumers need the
// WCAG scope and nothing else, and this is how they get it.
//
// Now also exports the browserless/browser partition (BROWSERLESS_RULES,
// BROWSER_REQUIRED_RULES) so the jsdom tier and the browser gates can both
// import from the same source — the same reason WCAG_TAGS is not restated.
export { WCAG_TAGS, BROWSERLESS_RULES, BROWSER_REQUIRED_RULES } from "@ecoma-io/loom-core";
