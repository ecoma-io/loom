// The `@ecoma-io/loom/a11y` entry.
//
// It exists because the main entry re-exports every component, which makes it
// unresolvable for a consumer that is not compiling Vue single-file components
// at all — an end-to-end test runner, a CI script. Those consumers need the
// WCAG scope and nothing else, and this is how they get it.
//
// Now also exports the browserless/browser partition (BROWSERLESS_RULES,
// BROWSER_REQUIRED_RULES) and the role-aware evidence contract
// (A11Y_EVIDENCE_TIERS/REQUIREMENTS/MATRIX, the role vocabulary and the
// A11yContract sidecar type) so the jsdom tier, the browser gates and
// tools/check-a11y-evidence.ts's consumers can all import from the same
// source — the same reason WCAG_TAGS is not restated.
export {
  WCAG_TAGS,
  BROWSERLESS_RULES,
  BROWSER_REQUIRED_RULES,
  A11Y_EVIDENCE_TIERS,
  A11Y_EVIDENCE_REQUIREMENTS,
  A11Y_EVIDENCE_MATRIX,
  ARIA_ROLES,
  NON_ROLE_MEMBERS,
  A11Y_ROLES,
} from "@ecoma-io/loom-core";
export type {
  A11yContract,
  A11yRole,
  AriaRole,
  A11yEvidenceTier,
  A11yRequirementId,
  A11yEvidenceEntry,
} from "@ecoma-io/loom-core";
