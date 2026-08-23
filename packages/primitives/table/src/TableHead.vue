<script lang="ts">
import type { TableAlign } from "./Table.vue";

/**
 * Sort state for a sortable header. Tri-state by omission: a sortable column
 * that is not the active sort simply has no direction, which is what
 * `aria-sort`'s absent-attribute form expresses.
 */
export type TableSort = "asc" | "desc";

/** Alignment vocabulary shared with `TableCell`. */
const ALIGN_CLASS: Record<TableAlign, string> = {
  left: "text-left",
  center: "text-center",
  // Numeric columns are read down, not across; tabular digits keep the
  // places lined up while the eye travels.
  right: "text-right [font-variant-numeric:tabular-nums]",
};

export const headAlignClass = (align: TableAlign | undefined): string =>
  align ? ALIGN_CLASS[align] : "";

/** Cycle order: nothing → ascending → descending → nothing. */
export const nextSort = (current: TableSort | undefined): TableSort | undefined =>
  current === undefined ? "asc" : current === "asc" ? "desc" : undefined;
</script>

<script setup lang="ts">
import { computed, ref } from "vue";
import { ChevronDown, ChevronsUpDown, ChevronUp } from "@lucide/vue";
import { useLabels, type LabelOverrides, type TableLabels } from "@ecoma-io/loom-labels";
import { cn } from "@ecoma-io/loom-core";
import { TABLE_LABELS } from "./Table.vue";

const props = withDefaults(
  defineProps<{
    /** Text alignment; numeric columns want `"right"`. */
    align?: TableAlign;
    /**
     * Renders the header as a sort control cycling asc → desc → none.
     * State is the host's through `v-model:sort`; omit the binding and the
     * header cycles on its own while still reporting each change.
     */
    sortable?: boolean;
    /** The current direction when sortable. Omit it for an uncontrolled cycle. */
    sort?: TableSort | undefined;
    /** Names what the control says on its own account, as any subset of `TableLabels`. */
    labels?: LabelOverrides<TableLabels>;
  }>(),
  { sortable: false },
);

const emit = defineEmits<{ "update:sort": [value: TableSort | undefined] }>();

// `text`, not `labels`: one of three sources, resolved key by key.
const text = useLabels("table", TABLE_LABELS, () => props.labels);

// Uncontrolled fallback lives here so a host can write plain `sortable`.
const inner = ref<TableSort | undefined>(undefined);
const current = computed(() => props.sort ?? inner.value);

function toggle(): void {
  const next = nextSort(current.value);
  inner.value = next;
  emit("update:sort", next);
}

const SORT_ICON = { asc: ChevronUp, desc: ChevronDown } as const;
const sortIcon = computed(() => (current.value ? SORT_ICON[current.value] : ChevronsUpDown));

// aria-sort takes full ARIA tokens, not our compact union.
const ARIA_SORT = { asc: "ascending", desc: "descending" } as const;
const ariaSort = computed(() => (current.value ? ARIA_SORT[current.value] : undefined));
</script>

<template>
  <th scope="col" :aria-sort="ariaSort" :class="cn(headAlignClass(align))">
    <!-- The sort control carries its state in words as well as glyphs — a
         chevron alone is colour/shape-only semantics. `min-h-6` is the WCAG
         2.5.8 floor made explicit: a text-xs label alone sits under the 24px
         target every interactive control owes. -->
    <button
      v-if="sortable"
      type="button"
      class="inline-flex min-h-6 items-center gap-1 rounded-sm px-1 transition-colors duration-fast ease-out hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:shadow-halo"
      @click="toggle()"
    >
      <span class="group inline-flex items-center gap-1 font-semibold">
        <slot />
      </span>
      <component
        :is="sortIcon"
        class="h-3.5 w-3.5 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
      <span class="sr-only">{{
        current === "asc"
          ? text.sortedAscending
          : current === "desc"
            ? text.sortedDescending
            : text.sort
      }}</span>
    </button>
    <template v-else><slot /></template>
  </th>
</template>
