<script lang="ts">
import type { TableLabels } from "@ecoma-io/loom-labels";

/**
 * Loom's English, co-located with the component so it tree-shakes with it,
 * and exported so a host can build a partial vocabulary against the real
 * thing rather than a transcription of it.
 */
export const TABLE_LABELS: TableLabels = {
  region: "Data table",
  sortedAscending: "Sorted ascending",
  sortedDescending: "Sorted descending",
  sort: "Sort",
};

/** The wrapper owns row padding so every cell under it tightens together. */
export type TableDensity = "comfortable" | "compact";

/** Alignment vocabulary shared by headers and cells. */
export type TableAlign = "left" | "center" | "right";
</script>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useLabels, type LabelOverrides } from "@ecoma-io/loom-labels";
import { cn } from "@ecoma-io/loom-core";

const props = withDefaults(
  defineProps<{
    /**
     * The table's caption, rendered as a real `<caption>` — the accessible
     * name for the whole table and the first thing a screen reader says.
     */
    caption?: string;
    /** Row padding. Compact suits dense application chrome. */
    density?: TableDensity;
    /** Names what the table is when no caption fits visually; falls to the labels seam otherwise. */
    labels?: LabelOverrides<TableLabels>;
  }>(),
  { density: "comfortable" },
);

// `text`, not `labels`: the prop of that name is one of the three sources
// this resolves, and a template reading the raw prop would be reading the
// overrides rather than the answer.
const text = useLabels("table", TABLE_LABELS, () => props.labels);

// The region is focusable only while it can actually scroll: a Tab stop that
// never moves is a dead one. Overflow is measured, not assumed — tables fit
// their container most of the time — and re-measured whenever either side of
// the ratio changes.
const region = ref<HTMLElement | null>(null);
const table = ref<HTMLElement | null>(null);
const scrollable = ref(false);

function measure(): void {
  const el = region.value;
  if (el) scrollable.value = el.scrollWidth > el.clientWidth;
}

let observer: ResizeObserver | undefined;
onMounted(() => {
  measure();
  observer = new ResizeObserver(measure);
  if (table.value) observer.observe(table.value);
  window.addEventListener("resize", measure, { passive: true });
});
onBeforeUnmount(() => {
  observer?.disconnect();
  window.removeEventListener("resize", measure);
});
</script>

<template>
  <!-- A scroll container, not the table itself: wide tables overflow their
       region instead of stretching the page (Loom's content-never-stretches
       law), and the region carries the caption as its accessible name so a
       screen reader announces what this scrollable thing IS before entering.
       Focusable only while it can actually scroll — measured below, since a
       focusable region that never scrolls is a dead Tab stop. -->
  <div
    ref="region"
    role="region"
    :aria-label="caption ?? text.region"
    :tabindex="scrollable ? 0 : undefined"
    class="w-full overflow-x-auto rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:shadow-halo"
  >
    <table
      ref="table"
      :data-density="density"
      :class="
        cn(
          'w-full border-collapse text-left text-sm',
          // Descendant styling is the wrapper's job: writing these per-cell
          // would re-litigate the hairline at every call site.
          '[&_th]:border-b [&_th]:border-border-strong [&_th]:px-3 [&_th]:py-2.5 [&_th]:text-xs [&_th]:font-semibold [&_th]:text-muted-foreground [&_th]:whitespace-nowrap',
          '[&_td]:border-b [&_td]:border-border [&_td]:px-3 [&_td]:align-top [&_td]:text-foreground',
          `[&[data-density='comfortable']_td]:py-3`,
          `[&[data-density='compact']_td]:py-1.5`,
          `[&[data-density='compact']_th]:py-1.5`,
          '[&_tbody_tr:last-child_td]:border-b-0',
          '[&_tfoot_td]:border-t [&_tfoot_td]:border-border-strong [&_tfoot_td]:font-medium',
        )
      "
    >
      <caption v-if="caption" class="sr-only">
        {{
          caption
        }}
      </caption>
      <!-- @slot Real table markup: `<thead>`/`<tbody>`/`<tfoot>` rows built
           from `TableRow`, `TableHead` and `TableCell`. -->
      <slot />
    </table>
  </div>
</template>
