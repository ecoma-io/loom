/**
 * The recorded exceptions to the composition conformance contract — the rows
 * that stand in for the adapter-and-cases evidence a composition does not own
 * yet. `tools/check-composition-conformance.ts` reads this file as data: a
 * composition with neither the evidence set nor a row here fails the gate, and
 * a row whose composition has since landed the full set fails too — an
 * exception expires the day its evidence arrives: 4A's four twin landings
 * deleted their rows instead of letting them rot into a second silent
 * allowance, while a row whose question is answered in writing is rewritten,
 * not deleted — scroll-reel's row became ADR-002's by-design declaration
 * (docs/architecture/decisions/0002-scroll-reel-css-only-by-design.md), and
 * its `removal` field names the only condition that deletes it. A row
 * excuses what is ABSENT only: evidence a composition owns that fails a rule
 * fails the gate even under a row. The shape
 * is module-boundaries.config.mjs' suppression rows: every field mandatory,
 * an unexplained row indistinguishable from a forgotten one.
 *
 * This file is the only hand list the gate carries, and it lists ABSENCES —
 * the compositions themselves are enumerated from the tree, never from here.
 */
export interface CompositionConformanceException {
  /** The composition directory name under `packages/composition/`. */
  composition: string;
  /** Why the evidence set is legitimately absent today. */
  reason: string;
  /** Who owns closing the gap. */
  owner: string;
  /** The milestone by which the row must be gone — the remover, named. */
  removal: string;
}

export const COMPOSITION_CONFORMANCE_EXCEPTIONS: readonly CompositionConformanceException[] = [
  {
    composition: "scroll-reel",
    reason:
      "Declared CSS-only by design — ADR-002 (docs/architecture/decisions/0002-scroll-reel-css-only-by-design.md) resolves the question this row carried. The arrangement's essence — the scroll container, the overflowing strip and scroll-snap alignment — has no static-geometry footprint in the engine's single-line flexbox IR, and the component's DOM ships CSS-default flex-shrink, so no adapter tree both models the real DOM and reaches the reel's operating point: the route's fixed-box fixtures shrink to fit, and a flexShrink: 0 claim would be contradicted at any overflowing case and never exercised at a fitting one. The substrate the IR could map is already held by the jsdom class pins, Stack's cases over the same gap utilities, and the 3B behavioural e2e, which is what holds the arrangement instead of an engine twin.",
    owner:
      "Layout-engine boundary owner — the question reopens only where the engine changes, not the component (no phase currently owns scroll-container modelling).",
    removal:
      "No milestone: a by-design declaration, not debt. The row is deleted only if the engine's modelled subset ever admits scroll containers or snap points, or the component grows a static-geometry fact a plain one-line row does not carry.",
  },
];
