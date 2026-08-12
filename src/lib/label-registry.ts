import type { PaginationLabels } from "../primitives/Pagination/Pagination.vue";
import type { WindowControlsLabels } from "../primitives/WindowControls/WindowControls.vue";

/**
 * Every slot a host can localise, and nothing else. One line per component that
 * speaks; the keys themselves live with the component that says them.
 *
 * This file exists so that both halves of the seam can be true at once. The
 * *keys* belong beside the component — `PaginationLabels` is declared in
 * `Pagination.vue`, where its doc comments sit next to the markup that renders
 * them and where a component's whole contract can be read in one file. The
 * *namespace* has to be central, or `provideLoomLabels({ pagination: … })` could
 * not check a misspelled slot and a consumer would have no single place to see
 * what the library can be asked to say.
 *
 * Every import here is `import type`, so this module emits nothing and the
 * apparent cycle — component imports `useLabels`, `useLabels` imports this,
 * this imports the component — exists only in the type graph, where TypeScript
 * resolves it lazily. A value import in this file would turn the whole library
 * into one chunk and cost every consumer the components they did not use.
 *
 * Adding a component to the sweep is one line. Adding it in the wrong shape is
 * a compile error at that component's own `useLabels` call, not here.
 */
export interface LoomLabels {
  readonly pagination: PaginationLabels;
  readonly windowControls: WindowControlsLabels;
}
