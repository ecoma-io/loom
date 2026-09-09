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
export {
  LIST_STAGGER_CAP,
  LIST_STAGGER_STEP_MS,
  listStaggerDelay,
  smoothScrollBehavior,
} from "./motion";

// The WCAG scope the library holds itself to.
export { WCAG_TAGS, BROWSERLESS_RULES, BROWSER_REQUIRED_RULES } from "./a11y-scope";

// The role-aware evidence contract the scope is answered per component —
// exported for the same reason the partition is: the narrow a11y entry is the
// one import a non-Vue consumer can afford.
export {
  A11Y_EVIDENCE_TIERS,
  A11Y_EVIDENCE_REQUIREMENTS,
  A11Y_EVIDENCE_MATRIX,
  ARIA_ROLES,
  NON_ROLE_MEMBERS,
  A11Y_ROLES,
} from "./a11y-contract";
export type {
  A11yContract,
  A11yRole,
  AriaRole,
  A11yEvidenceTier,
  A11yRequirementId,
  A11yEvidenceEntry,
} from "./a11y-contract";

// The behavioural viewport contract — the bands the composition adapters
// build their steps on. Not re-exported from the public @ecoma-io/loom entry:
// nothing outside the gate, the pin test and the adapters reads it yet.
export {
  RESPONSIVE_BEHAVIOURS,
  RESPONSIVE_EVIDENCE_TIERS,
  RESPONSIVE_VIEWPORT_BANDS,
} from "./responsive-contract";
export type {
  ResponsiveBehaviour,
  ResponsiveEvidenceTier,
  ResponsiveViewportBand,
  ResponsiveEvidenceEntry,
  ResponsiveContract,
} from "./responsive-contract";

// Theme switching (also re-exported from the public @ecoma-io/loom entry).
export { useTheme, themeScript } from "./theme";
export type { ThemePreference, ResolvedTheme } from "./theme";

// Icon defaults for @lucide/vue.
export { applyLoomIconDefaults } from "./icon-defaults";
