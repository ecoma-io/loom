<script setup lang="ts">
import { computed, inject } from "vue";
import { cn } from "@ecoma-io/loom-core";
import type { TreeNode } from "./TreeView.vue";
import { TREE_VIEW_CONTEXT, type TreeViewNodeState } from "./context";

const props = defineProps<{
  /**
   * The node this row renders, with its subtree beneath it. Named `row` so
   * the public `node` slot can forward by object spread without colliding.
   */
  row: TreeNode;
  /** One-based depth — what `aria-level` says. */
  level: number;
  /** How many siblings this row has — what `aria-setsize` says. */
  setsize: number;
  /** This row's one-based position among those siblings — what `aria-posinset` says. */
  posinset: number;
}>();

// Declared, not inferred: the recursive render hands this component's own
// `node` slot back to itself, so a type inferred from the template would have
// to already exist to be inferred. Naming it here ends the cycle and types
// every depth of the recursion the same way. This is the internal row — Loom
// keeps its public slots untyped, per house style.
defineSlots<{
  /**
   * One row's content, forwarded from the TreeView that owns the tree — see
   * that component's `node` slot.
   *
   * The parameter exists only to type the scoped-slot props; the template
   * re-emits the scope whole, so the name itself is never read — a
   * type-position parameter is neither arg nor var to the base rule's
   * underscore patterns, so a narrow disable is the honest suppression.
   */
  // eslint-disable-next-line no-unused-vars
  node?: (slotProps: { node: TreeNode; state: TreeViewNodeState }) => unknown;
}>();

const ctx = inject(TREE_VIEW_CONTEXT);
if (!ctx) throw new Error("TreeViewNode must be rendered inside a TreeView.");

const state = computed(() => ctx.stateFor(props.row));
const children = computed(() => ctx.childrenOf(props.row));
// `aria-expanded` and `aria-selected` want the literal strings "true"/"false";
// `String()` widens to `string`, which the ARIA types refuse.
const ariaExpanded = computed(() =>
  state.value.expandable ? (state.value.expanded ? "true" : "false") : undefined,
);
const ariaSelected = computed(() => (state.value.selected ? "true" : "false"));
</script>

<template>
  <!--
    The role carrier and the focus carrier are different elements on purpose.
    ARIA attributes belong on the `li` the tree grammar expects; the tab stop,
    the focus ring and the highlight sit on the inner row `div`, so the ring
    wraps the row the reader is on and not the whole open branch beneath it.
  -->
  <li
    role="treeitem"
    :aria-level="level"
    :aria-setsize="setsize"
    :aria-posinset="posinset"
    :aria-expanded="ariaExpanded"
    :aria-selected="ariaSelected"
    :aria-disabled="state.disabled ? 'true' : undefined"
    :aria-busy="state.busy ? 'true' : undefined"
  >
    <!-- eslint-disable-next-line vuejs-accessibility/click-events-have-key-events, vuejs-accessibility/no-static-element-interactions -- the row answers the keyboard through the one keydown on the root `<ul>` every keydown bubbles to; a per-row listener would duplicate it. -->
    <div
      :data-tree-value="String(row.value)"
      :tabindex="state.focusable ? 0 : -1"
      :class="
        cn(
          'flex cursor-pointer select-none items-center gap-1.5 rounded-sm px-2 py-1.5 text-sm outline-none',
          'transition-colors duration-fast ease-out',
          'hover:bg-subtle',
          'focus-visible:bg-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
          state.selected && 'bg-primary-muted text-primary-text',
          state.disabled && 'cursor-not-allowed',
        )
      "
      @focusin="ctx.onRowFocus(row)"
      @click="ctx.onRowActivate(row)"
    >
      <!--
        The disclosure control is a glyph, not a button: a real `<button>`
        would be a second tab stop inside every openable row, which is the one
        thing the roving-tabindex contract cannot afford. Pointer users click
        it; keyboard users reach the same behaviour with ArrowRight and
        ArrowLeft, so nothing is keyboard-only because of this.
      -->
      <span
        v-if="state.expandable"
        class="flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground"
        aria-hidden="true"
        @click.stop="ctx.onChevronActivate(row)"
      >
        <svg
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          :class="
            cn(
              'h-3.5 w-3.5 transition-transform duration-fast ease-out',
              state.expanded && 'rotate-90',
            )
          "
        >
          <path
            d="m6 4 4 4-4 4"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
      <!-- The same slot, left empty on a leaf, keeps every label on one axis. -->
      <span v-else class="h-4 w-4 shrink-0" aria-hidden="true"></span>

      <!-- @slot One row's content — the label, or anything a caller builds from
           the node — with `node` (the TreeNode) and `state` (expandable,
           expanded, selected, busy, disabled, focusable) scoped in. Falls
           back to the node's label. -->
      <slot name="node" :node="row" :state="state">
        <span class="truncate" :class="state.disabled && 'text-muted-foreground'">{{
          row.label
        }}</span>
      </slot>
      <span v-if="state.busy" class="shrink-0 text-small text-muted-foreground">{{
        ctx.loadingText.value
      }}</span>
    </div>

    <ul v-if="state.expanded" role="group" class="m-0 list-none p-0 pl-4">
      <TreeViewNode
        v-for="(child, index) in children"
        :key="child.value"
        :row="child"
        :level="level + 1"
        :setsize="children.length"
        :posinset="index + 1"
      >
        <template #node="slotProps">
          <slot name="node" v-bind="slotProps" />
        </template>
      </TreeViewNode>
    </ul>
  </li>
</template>
