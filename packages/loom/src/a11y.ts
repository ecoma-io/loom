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
// A11yContract sidecar type). The contract's own readers do not come through
// here today — the gate parses the law from packages/core/src/a11y-contract.ts
// and its pin test imports core directly — so this re-export is a bet, not a
// dependency: a consumer or docs page that wants to read the evidence law
// gets it from the same facade that carries WCAG_TAGS, which is restated
// nowhere. If no reader ever arrives, dropping the re-export is a one-line
// deletion with no caller to migrate.
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
