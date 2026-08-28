import type { ComputedRef, InjectionKey } from "vue";
import type { TreeNode } from "./TreeView.vue";

/**
 * What a row needs to know about itself, resolved by the tree that owns the
 * state. The node component stays presentational: it computes nothing about
 * expandability, selection or focus and renders what it is handed.
 */
export interface TreeViewNodeState {
  /** The row can open and close — it has children to show. */
  expandable: boolean;
  /** The row is open, so its subtree is in the DOM beneath it. */
  expanded: boolean;
  /** The row is one of the chosen ones. */
  selected: boolean;
  /** The row's children are being fetched by `loadChildren` right now. */
  busy: boolean;
  /** The row, or the whole tree it stands in, is unavailable. */
  disabled: boolean;
  /** The row holds the roving tab stop — the one row Tab reaches. */
  focusable: boolean;
}

/**
 * The seam between the tree (which owns every bit of state and the keyboard)
 * and its rows. Provided once by the tree and injected at every depth, which
 * is what lets the recursion be a plain SFC: events go up through these
 * handlers, state comes down through these getters, and neither side carries
 * the other's props through N levels of re-emission.
 */
export interface TreeViewContext {
  stateFor(node: TreeNode): TreeViewNodeState;
  childrenOf(node: TreeNode): TreeNode[];
  /** The localised string shown while a row's children are being fetched. */
  loadingText: ComputedRef<string>;
  onRowFocus(node: TreeNode): void;
  onRowActivate(node: TreeNode): void;
  onChevronActivate(node: TreeNode): void;
}

export const TREE_VIEW_CONTEXT: InjectionKey<TreeViewContext> = Symbol("loom.tree-view");
