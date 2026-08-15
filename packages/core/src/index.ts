// Internal utilities shared by every Loom package.
//
// Nothing in this barrel depends on any other Loom package. Components and
// label utilities import from here; nothing here imports from them.

// Class-name merge and Tailwind conflict resolution.
export { cn } from "./cn";

// Prop helpers — dropping undefined keys for Vue's exactOptionalPropertyTypes.
export { optional } from "./props";

// Attribute splitting for inheritAttrs: false components.
export { useSplitAttrs } from "./attrs";

// The list-reveal stagger vocabulary.
export { LIST_STAGGER_CAP, LIST_STAGGER_STEP_MS, listStaggerDelay } from "./motion";

// The WCAG scope the library holds itself to.
export { WCAG_TAGS } from "./a11y-scope";

// Theme switching (also re-exported from the public @ecoma-io/loom entry).
export { useTheme, themeScript } from "./theme";
export type { ThemePreference, ResolvedTheme } from "./theme";

// Icon defaults for @lucide/vue.
export { applyLoomIconDefaults } from "./icon-defaults";
