<script lang="ts">
import type { LabelOverrides, TreeViewLabels } from "@ecoma-io/loom-labels";

/**
 * Loom's English, co-located with the component so it tree-shakes with it.
 * Everything else a tree renders is a node's own label, so the bag is one
 * string — but it is a string a reader waits on.
 */
export const TREE_VIEW_LABELS: TreeViewLabels = {
  loading: "Loading…",
};

/**
 * One node of the tree. `children`'s shape is the contract for expansion: an
 * array of any length (including empty — a known leaf) is static data the
 * tree renders directly, while a node *without* one under a `loadChildren`
 * tree is treated as a branch still to fetch.
 */
export interface TreeNode {
  /** The value bound to `v-model` when this node is chosen. Unique within the tree. */
  value: string | number;
  /** The text shown on the row and matched by the typeahead. */
  label: string;
  /** This node's children. Their presence is what makes the row expandable. */
  children?: TreeNode[];
  /** Present but unchoosable: visible, arrow-reachable, refuses selection and expansion. */
  disabled?: boolean;
}

/** Whether one node or several can be chosen at once. */
export type TreeViewSelectionMode = "single" | "multiple";
</script>

<script setup lang="ts">
import { computed, nextTick, onScopeDispose, provide, ref, watch } from "vue";
import { useAncestorDisabled, useLabels } from "@ecoma-io/loom-labels";
import { TREE_VIEW_CONTEXT, type TreeViewContext, type TreeViewNodeState } from "./context";
import TreeViewNode from "./TreeViewNode.vue";

const props = withDefaults(
  defineProps<{
    /** The nodes, in the order they are shown, parents before children. */
    nodes: TreeNode[];
    /**
     * The chosen node's `value` — or every chosen value, when `selectionMode`
     * is "multiple". The union, not two generic shapes, for the same reason
     * Combobox is: `v-model` needs one binding whose type does not depend on
     * another prop's value, and a scalar/array mismatch is caught the same
     * place the tree catches it — at the render.
     */
    modelValue?: string | number | Array<string | number> | undefined;
    /** Whether one node or several can be chosen at once. */
    selectionMode?: TreeViewSelectionMode;
    /**
     * Fetch a branch's children the first time it is expanded. A node with no
     * `children` of its own is treated as lazily loadable; one that resolves
     * to an empty array becomes a leaf, and a rejected fetch leaves the node
     * collapsed so the next activation retries rather than caching failure.
     */
    loadChildren?: (node: TreeNode) => Promise<TreeNode[]>;
    /** Node values expanded on mount. After mount the tree owns the state. */
    defaultExpanded?: Array<string | number>;
    /**
     * Unavailable: the rows dim, refuse selection and expansion, and drop out
     * of the tab order. Unset defers to an enclosing `<fieldset disabled>`
     * read straight off the DOM.
     */
    disabled?: boolean | undefined;
    /** Names for the strings this control supplies itself. */
    labels?: LabelOverrides<TreeViewLabels> | undefined;
  }>(),
  {
    modelValue: undefined,
    selectionMode: "single",
    defaultExpanded: () => [],
    disabled: undefined,
    labels: undefined,
  },
);

const emit = defineEmits<{
  /** The chosen node's `value` — or the whole chosen list, when `selectionMode` is "multiple". */
  "update:modelValue": [value: string | number | Array<string | number>];
}>();

/**
 * A row as the keyboard sees it: one step of the depth-first walk of the
 * visible tree, with everything the key map needs resolved once per change
 * instead of per keystroke.
 */
interface FlatRow {
  value: string | number;
  node: TreeNode;
  level: number;
  setsize: number;
  posinset: number;
  parentId: string | number | null;
  expandable: boolean;
  expanded: boolean;
  selected: boolean;
  busy: boolean;
  disabled: boolean;
}

const rootEl = ref<HTMLUListElement | null>(null);

const ancestorDisabled = useAncestorDisabled(() => rootEl.value);
const controlDisabled = computed(() => (props.disabled ?? false) || ancestorDisabled.value);

const text = useLabels("treeView", TREE_VIEW_LABELS, () => props.labels);

// Seeded once from `defaultExpanded`, then the tree owns it — a prop the user
// edits after mount silently losing their edits is worse than a seed.
const expandedKeys = ref(new Set<string | number>(props.defaultExpanded));
const loadingKeys = ref(new Set<string | number>());
const lazyChildren = ref(new Map<string | number, TreeNode[]>());
const focusValue = ref<string | number | null>(null);

function toKeySet(
  model: string | number | Array<string | number> | undefined,
): Set<string | number> {
  if (model == null) return new Set();
  return new Set(Array.isArray(model) ? model : [model]);
}

// A mirror rather than a read-through, so the tree works uncontrolled (`v-model`
// absent, `modelValue` never supplied) exactly as it does controlled — the same
// contract Combobox keeps.
const selectedKeys = ref(toKeySet(props.modelValue));
watch(
  () => props.modelValue,
  (next) => {
    selectedKeys.value = toKeySet(next);
  },
);

function childrenOf(node: TreeNode): TreeNode[] {
  if (Array.isArray(node.children)) return node.children;
  return lazyChildren.value.get(node.value) ?? [];
}

/**
 * A row can open when it has children to show: a non-empty `children` array,
 * or a fetch already resolved beneath it — an empty resolution *is* the
 * answer, and the row collapses back to a leaf rather than offering a branch
 * that opens onto nothing.
 */
function isExpandable(node: TreeNode): boolean {
  if (Array.isArray(node.children)) return node.children.length > 0;
  const loaded = lazyChildren.value.get(node.value);
  if (loaded) return loaded.length > 0;
  return props.loadChildren != null;
}

const flatRows = computed<FlatRow[]>(() => {
  const rows: FlatRow[] = [];
  const walk = (nodes: TreeNode[], level: number, parentId: string | number | null): void => {
    for (let index = 0; index < nodes.length; index++) {
      const node = nodes[index];
      if (!node) continue;
      const expandable = isExpandable(node);
      const expanded = expandable && expandedKeys.value.has(node.value);
      rows.push({
        value: node.value,
        node,
        level,
        setsize: nodes.length,
        posinset: index + 1,
        parentId,
        expandable,
        expanded,
        selected: selectedKeys.value.has(node.value),
        busy: loadingKeys.value.has(node.value),
        disabled: (node.disabled ?? false) || controlDisabled.value,
      });
      if (expanded) walk(childrenOf(node), level + 1, node.value);
    }
  };
  walk(props.nodes, 1, null);
  return rows;
});

const rowByValue = computed(() => new Map(flatRows.value.map((row) => [row.value, row])));

// The roving tab stop: wherever the reader last was, or — before the first
// arrow key — the first row a Tab is allowed to land on. A disabled row is
// reachable from inside the tree but never *entered* from outside it.
const tabStopValue = computed<string | number | null>(() => {
  if (focusValue.value != null && rowByValue.value.has(focusValue.value)) {
    return focusValue.value;
  }
  const firstEnabled = flatRows.value.find((row) => !row.disabled);
  return firstEnabled?.value ?? null;
});

function stateFor(node: TreeNode): TreeViewNodeState {
  const row = rowByValue.value.get(node.value);
  return {
    expandable: row?.expandable ?? false,
    expanded: row?.expanded ?? false,
    selected: row?.selected ?? false,
    busy: row?.busy ?? false,
    disabled: row?.disabled ?? false,
    focusable: !controlDisabled.value && row?.value === tabStopValue.value,
  };
}

async function expandRow(row: FlatRow): Promise<void> {
  const value = row.node.value;
  if (
    row.disabled ||
    !row.expandable ||
    expandedKeys.value.has(value) ||
    loadingKeys.value.has(value)
  ) {
    return;
  }
  const isLazy =
    !Array.isArray(row.node.children) &&
    props.loadChildren != null &&
    !lazyChildren.value.has(value);
  if (isLazy && props.loadChildren) {
    loadingKeys.value = new Set(loadingKeys.value).add(value);
    try {
      const children = await props.loadChildren(row.node);
      const next = new Map(lazyChildren.value);
      next.set(value, children);
      lazyChildren.value = next;
    } catch {
      // The fetch failed: leave the row collapsed and still expandable, so
      // the next activation retries rather than caching a broken branch.
      return;
    } finally {
      const settled = new Set(loadingKeys.value);
      settled.delete(value);
      loadingKeys.value = settled;
    }
  }
  expandedKeys.value = new Set(expandedKeys.value).add(value);
}

function collapseRow(value: string | number): void {
  const next = new Set(expandedKeys.value);
  next.delete(value);
  expandedKeys.value = next;
}

function selectRow(node: TreeNode): void {
  if (controlDisabled.value || node.disabled) return;
  if (props.selectionMode === "multiple") {
    const next = new Set(selectedKeys.value);
    if (next.has(node.value)) next.delete(node.value);
    else next.add(node.value);
    selectedKeys.value = next;
    emit("update:modelValue", [...next]);
    return;
  }
  selectedKeys.value = new Set([node.value]);
  emit("update:modelValue", node.value);
}

function rowElement(value: string | number): HTMLElement | null {
  const root = rootEl.value;
  if (!root) return null;
  return root.querySelector<HTMLElement>(`[data-tree-value="${CSS.escape(String(value))}"]`);
}

function focusRow(row: FlatRow | undefined): void {
  if (!row) return;
  focusValue.value = row.node.value;
  void nextTick(() => {
    rowElement(row.value)?.focus();
  });
}

function onRowFocus(node: TreeNode): void {
  focusValue.value = node.value;
}

function onRowActivate(node: TreeNode): void {
  const row = rowByValue.value.get(node.value);
  if (!row || controlDisabled.value) return;
  focusRow(row);
  selectRow(node);
}

function onChevronActivate(node: TreeNode): void {
  const row = rowByValue.value.get(node.value);
  if (!row || controlDisabled.value || row.disabled) return;
  focusRow(row);
  if (row.expanded) collapseRow(node.value);
  else void expandRow(row);
}

function currentRowIndex(): number {
  if (focusValue.value == null) return -1;
  return flatRows.value.findIndex((row) => row.value === focusValue.value);
}

/*
 * The typeahead. APG trees match a prefix of the row's label, starting after
 * the current row and wrapping; the same character typed again cycles to that
 * character's next match rather than extending a prefix to itself. The buffer
 * is 500 ms, and the timer is released with the scope so a tree torn down
 * mid-typeahead leaves nothing pending.
 */
const TYPEAHEAD_RESET_MS = 500;
let typeaheadBuffer = "";
let typeaheadTimer: ReturnType<typeof setTimeout> | undefined;

function handleTypeahead(event: KeyboardEvent): void {
  if (event.key.length !== 1 || event.altKey || event.ctrlKey || event.metaKey) return;
  if (flatRows.value.length === 0) return;
  const char = event.key.toLowerCase();
  if (typeaheadBuffer !== char) typeaheadBuffer += char;
  const query = typeaheadBuffer;
  const start = currentRowIndex() + 1;
  for (let step = 0; step < flatRows.value.length; step++) {
    const row = flatRows.value[(start + step) % flatRows.value.length];
    // Typeahead is a jump made from outside the walk, like the entry tab
    // stop: it lands on a row the reader can act on. The arrows remain the
    // way to deliberately rest on a disabled row.
    if (row && !row.disabled && row.node.label.toLowerCase().startsWith(query)) {
      focusRow(row);
      break;
    }
  }
  event.preventDefault();
  if (typeaheadTimer !== undefined) clearTimeout(typeaheadTimer);
  typeaheadTimer = setTimeout(() => {
    typeaheadBuffer = "";
    typeaheadTimer = undefined;
  }, TYPEAHEAD_RESET_MS);
}

onScopeDispose(() => {
  if (typeaheadTimer !== undefined) clearTimeout(typeaheadTimer);
});

/**
 * One keydown on the root, reached from every row by bubbling: the key map is
 * written once against the flat visible walk instead of duplicated per row.
 * Disabled rows stay in the arrow walk — present and reachable, per the APG —
 * but Enter, Space and the disclosure keys refuse them.
 */
function onKeydown(event: KeyboardEvent): void {
  if (controlDisabled.value) return;
  const rows = flatRows.value;
  if (rows.length === 0) return;
  const index = currentRowIndex();
  const row = index >= 0 ? rows[index] : undefined;

  switch (event.key) {
    case "ArrowDown": {
      const next = rows[index + 1];
      if (next) focusRow(next);
      break;
    }
    case "ArrowUp": {
      const previous = index > 0 ? rows[index - 1] : undefined;
      if (previous) focusRow(previous);
      break;
    }
    case "Home":
      focusRow(rows[0]);
      break;
    case "End":
      focusRow(rows[rows.length - 1]);
      break;
    case "ArrowRight": {
      if (!row) break;
      if (row.disabled) break;
      if (row.expandable && !row.expanded) {
        void expandRow(row);
        break;
      }
      if (row.expanded) {
        const child = rows[index + 1];
        if (child && child.level === row.level + 1) focusRow(child);
      }
      break;
    }
    case "ArrowLeft": {
      if (!row) break;
      if (row.disabled) break;
      if (row.expandable && row.expanded) {
        collapseRow(row.value);
        break;
      }
      if (row.parentId != null) {
        const parent = rowByValue.value.get(row.parentId);
        if (parent) focusRow(parent);
      }
      break;
    }
    case "Enter":
    case " ":
      if (row) selectRow(row.node);
      break;
    default:
      handleTypeahead(event);
      return;
  }
  event.preventDefault();
}

provide(TREE_VIEW_CONTEXT, {
  stateFor,
  childrenOf,
  loadingText: computed(() => text.value.loading),
  onRowFocus,
  onRowActivate,
  onChevronActivate,
} satisfies TreeViewContext);
</script>

<!--
  The tree is a plain `<ul>`, so the caller's `aria-label`, `aria-labelledby`
  and `id` fall through to it untouched — naming the tree is naming the
  element, exactly as the APG example does. Rows render one tab stop at a
  time (roving tabindex); the keydown above is the only keyboard listener.
-->
<template>
  <!-- eslint-disable-next-line vuejs-accessibility/interactive-supports-focus -- the container is deliberately not focusable: focus roves across the rows (APG tree view), so exactly one row holds the tab stop and the `<ul>` itself never takes one. -->
  <ul
    ref="rootEl"
    role="tree"
    :aria-multiselectable="selectionMode === 'multiple' ? 'true' : undefined"
    :aria-disabled="controlDisabled ? 'true' : undefined"
    class="m-0 list-none select-none p-0 text-sm text-foreground"
    @keydown="onKeydown"
  >
    <TreeViewNode
      v-for="(node, index) in nodes"
      :key="node.value"
      :node="node"
      :level="1"
      :setsize="nodes.length"
      :posinset="index + 1"
    />
  </ul>
</template>
