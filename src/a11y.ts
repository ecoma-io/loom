// The `@ecoma-io/loom/a11y` entry.
//
// It exists because the main entry re-exports every component, which makes it
// unresolvable for a consumer that is not compiling Vue single-file
// components at all — an end-to-end test runner, a CI script. Those consumers
// need the WCAG scope and nothing else, and this is how they get it.
export { WCAG_TAGS } from "./lib/a11y-scope";
