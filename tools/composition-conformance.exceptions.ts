/**
 * The recorded exceptions to the composition conformance contract — the rows
 * that stand in for the adapter-and-cases evidence a composition does not own
 * yet. `tools/check-composition-conformance.ts` reads this file as data: a
 * composition with neither the evidence set nor a row here fails the gate, and
 * a row whose composition has since landed the full set fails too — an
 * exception expires the day its evidence arrives, so 4A's landings delete
 * rows instead of letting them rot into a second silent allowance. The shape
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
    composition: "dashboard-grid",
    reason:
      "No adapter exists and the grid-template arrangement has no designed engine mapping yet. The composition joined the tier in 2C (ADR-001) and was named by no planning document until gap P1's census correction — the least-ready twin must still be a NAMED one.",
    owner: "Phase 4A (composition twins)",
    removal:
      "Phase 4A — the pull request that lands dashboard-grid's adapter and cases deletes this row.",
  },
  {
    composition: "grid",
    reason:
      "No adapter exists; jsdom class pins are the only layout evidence (gap P1's no-computable-twin list).",
    owner: "Phase 4A (composition twins)",
    removal: "Phase 4A — the pull request that lands grid's adapter and cases deletes this row.",
  },
  {
    composition: "scroll-reel",
    reason:
      "The scroll-snap arrangement may be CSS-only by design — whether an honest engine mapping exists is undecided (gap P1). The written declaration, either way, is the row's way out.",
    owner: "Phase 4A (composition twins)",
    removal:
      "Phase 4A — replaced by scroll-reel's adapter and cases, or by the recorded CSS-only declaration.",
  },
  {
    composition: "sidebar",
    reason:
      "No adapter exists; jsdom class pins are the only layout evidence. The auditors' first-priority twin (gap P1's risk order).",
    owner: "Phase 4A (composition twins)",
    removal: "Phase 4A — the pull request that lands sidebar's adapter and cases deletes this row.",
  },
  {
    composition: "split",
    reason:
      "Percent-length sizing sits outside the engine's modelled subset, so the twin waits on gap P1's boundary decision; one behavioural e2e exists and no adapter does.",
    owner: "Phase 4A (composition twins)",
    removal: "Phase 4A — the pull request that lands split's adapter and cases deletes this row.",
  },
];
