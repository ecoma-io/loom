/**
 * The public surface of `@ecoma-io/loom`.
 *
 * This file is the complete export list, and it is the file to read before
 * hand-rolling a generic affordance in a consuming product — the rule that
 * decides most questions, stated in CONTRIBUTING.md, is checked against
 * exactly this list.
 *
 * Two things deliberately do not appear here. Styles ship as CSS, imported by
 * a host from `@ecoma-io/loom/styles/global.css`. And `WCAG_TAGS` ships from
 * the narrow `@ecoma-io/loom/a11y` entry, so a consumer that compiles no Vue
 * at all can read it without resolving a single component below.
 */

// Utilities.
export { cn } from "./lib/cn";
export { applyLoomIconDefaults } from "./lib/icon-defaults";
export { LIST_STAGGER_CAP, LIST_STAGGER_STEP_MS, listStaggerDelay } from "./lib/motion";

// Primitives.
export { default as Button, buttonVariants } from "./primitives/Button/Button.vue";
export type { ButtonSize, ButtonVariant } from "./primitives/Button/Button.vue";

// Icons — custom domain glyphs, taking the same props as any Lucide icon.
export { default as BrandMark } from "./icons/BrandMark";
