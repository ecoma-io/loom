<script lang="ts">
import type { DataGridLabels } from "@ecoma-io/loom-labels";
import type { TableAlign, TableDensity } from "@ecoma-io/loom-table";

/**
 * Loom's English, co-located with the component so it tree-shakes with it,
 * and exported so a host can build a partial vocabulary against the real
 * thing rather than a transcription of it.
 */
export const DATA_GRID_LABELS: DataGridLabels = {
  region: "Data grid",
  selectAll: "Select all rows",
  selectRow: "Select row",
  sortedAscending: "Sorted ascending",
  sortedDescending: "Sorted descending",
  sort: "Sort",
};

/** One column: what it reads, whether it sorts, how it aligns. */
export interface DataGridColumn {
  /** The row field this column renders; also the sort key. */
  key: string;
  /** The column header's text. */
  header: string;
  /** Renders the header as the tri-state sort control. */
  sortable?: boolean;
  /** Text alignment; numeric columns want `"right"`. */
  align?: TableAlign;
  /** Any CSS width, e.g. `"6rem"` — pins the column in the scrolling grid. */
  width?: string;
}

/** Sort direction, compact union — `aria-sort` takes the full ARIA tokens. */
export type DataGridSort = "asc" | "desc";

/** Which column is sorted, and which way. Absent: nothing is. */
export type DataGridSortState = { key: string; direction: DataGridSort } | undefined;

/**
 * DataGrid — the WAI-ARIA grids pattern: `Table`'s visual language with the
 * interactive half added. Table reads, DataGrid acts — rows are selectable
 * (`v-model:selectedRowKeys`, select-all with a real `aria-checked="mixed"`),
 * sortable headers carry `aria-sort`, and a row answers Enter/double-click
 * through `@row-activate`.
 *
 * The keyboard model is the APG one, and it is the reason this is not a
 * Table variant: the cell matrix holds exactly one Tab stop (roving
 * tabindex), so Tab enters and leaves the grid once while the arrow keys,
 * Home/End and their Ctrl variants move focus cell to cell. Focus — not
 * the pointer — is what a grid sells.
 *
 * There is no `aria-rowcount` on purpose: every row is in the DOM, so the
 * count is the DOM's to state. The attribute earns its place the day the
 * grid virtualizes, not before — an asserted virtual size over a real
 * partial DOM is the lie `aria-rowcount` exists to correct.
 */
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { ChevronDown, ChevronsUpDown, ChevronUp } from "@lucide/vue";
import { cn } from "@ecoma-io/loom-core";
import Checkbox from "@ecoma-io/loom-checkbox";
import { useLabels, type LabelOverrides } from "@ecoma-io/loom-labels";
import { headAlignClass, nextSort, tableRowVariants } from "@ecoma-io/loom-table";

const props = withDefaults(
  defineProps<{
    /** The columns, left to right. */
    columns: DataGridColumn[];
    /** The row objects; a column renders `row[column.key]`. */
    rows: Array<Record<string, unknown>>;
    /** The row field whose value keys selection. Defaults to `"id"`. */
    rowKey?: string;
    /** Adds the selection column: per-row checkboxes plus select-all with its mixed state. */
    selectable?: boolean;
    /**
     * The selected row keys when the host owns the selection through
     * `v-model:selectedRowKeys`; omit the binding and the grid owns the
     * state itself while still reporting every change.
     */
    selectedRowKeys?: Array<string | number>;
    /**
     * The active sort when the host owns it through `v-model:sort`; omit it
     * and the headers cycle on their own while still reporting each change.
     */
    sort?: DataGridSortState;
    /** Row padding. Compact suits dense application chrome. */
    density?: TableDensity;
    /** The grid's accessible name, read before a screen reader enters it. */
    caption?: string;
    /** Names what the grid says on its own account, as any subset of `DataGridLabels`. */
    labels?: LabelOverrides<DataGridLabels>;
  }>(),
  { rowKey: "id", selectable: false, density: "comfortable" },
);

const emit = defineEmits<{
  "update:selectedRowKeys": [value: Array<string | number>];
  "update:sort": [value: DataGridSortState];
  "sort-change": [value: DataGridSortState];
  rowActivate: [row: Record<string, unknown>];
}>();

// `text`, not `labels`: the prop of that name is one of the three sources
// this resolves (own prop, then the host vocabulary from
// `provideLoomLabels`, then these English defaults), and a template reading
// the raw prop would be reading the overrides rather than the answer.
const text = useLabels("dataGrid", DATA_GRID_LABELS, () => props.labels);

// ---------- selection ----------

const innerSelected = ref<Array<string | number>>([]);
const selected = computed(() => props.selectedRowKeys ?? innerSelected.value);

const keyOf = (row: Record<string, unknown>): string | number =>
  row[props.rowKey] as string | number;
const isSelected = (row: Record<string, unknown>): boolean => selected.value.includes(keyOf(row));

function setSelection(next: Array<string | number>): void {
  innerSelected.value = next;
  emit("update:selectedRowKeys", next);
}

const allSelected = computed(
  () => props.rows.length > 0 && props.rows.every((row) => isSelected(row)),
);
const someSelected = computed(
  () => !allSelected.value && props.rows.some((row) => isSelected(row)),
);

// Checkbox's own third state: reka renders it as `aria-checked="mixed"`,
// which is the select-all announcement the grid owes — a dash glyph alone is
// shape-only semantics.
const selectAllState = computed<"indeterminate" | boolean>(() =>
  allSelected.value ? true : someSelected.value ? "indeterminate" : false,
);

function toggleAll(): void {
  setSelection(allSelected.value ? [] : props.rows.map((row) => keyOf(row)));
}

function toggleRow(row: Record<string, unknown>): void {
  setSelection(
    isSelected(row)
      ? selected.value.filter((key) => key !== keyOf(row))
      : [...selected.value, keyOf(row)],
  );
}

const innerSort = ref<DataGridSortState>(undefined);
const currentSort = computed<DataGridSortState>(() => props.sort ?? innerSort.value);

const sortDirectionOf = (col: DataGridColumn): DataGridSort | undefined =>
  currentSort.value?.key === col.key ? currentSort.value.direction : undefined;

const ARIA_SORT = { asc: "ascending", desc: "descending" } as const;
const SORT_ICON = { asc: ChevronUp, desc: ChevronDown } as const;
const ariaSortOf = (col: DataGridColumn): (typeof ARIA_SORT)[DataGridSort] | undefined => {
  const direction = sortDirectionOf(col);
  return direction ? ARIA_SORT[direction] : undefined;
};
const sortIconOf = (col: DataGridColumn) => {
  const direction = sortDirectionOf(col);
  return direction ? SORT_ICON[direction] : ChevronsUpDown;
};
const sortWordsOf = (col: DataGridColumn): string => {
  const direction = sortDirectionOf(col);
  return direction === "asc"
    ? text.value.sortedAscending
    : direction === "desc"
      ? text.value.sortedDescending
      : text.value.sort;
};

function toggleSort(col: DataGridColumn): void {
  const direction = nextSort(sortDirectionOf(col));
  const next: DataGridSortState = direction ? { key: col.key, direction } : undefined;
  innerSort.value = next;
  // `sort-change` for hosts following the sketch's `@sort-change`,
  // `update:sort` so `v-model:sort` works the way every other control's does.
  emit("update:sort", next);
  emit("sort-change", next);
}

const colCount = computed(() => props.columns.length + (props.selectable ? 1 : 0));

// Rows: -1 is the header row, 0.. are body rows. Columns count the selection
// column first when `selectable`. Exactly one cell carries tabindex 0 — the
// active cell — so Tab enters and leaves the grid once; everything else is
// -1 and reachable only through the matrix moves.
const activeCell = ref({ row: props.rows.length > 0 ? 0 : -1, col: 0 });
const bodyColumnIndex = (i: number): number => (props.selectable ? i + 1 : i);
const isCellActive = (row: number, col: number): boolean =>
  activeCell.value.row === row && activeCell.value.col === col;

// Rows arriving or leaving can strand the active cell outside the matrix. The
// floor is -1, not 0: the header row is a valid roving stop too, and a floor
// of 0 would push the header onto a body row that does not exist once every
// row is gone, leaving the grid with no Tab stop at all.
watch(
  () => [props.rows.length, props.selectable, props.columns.length] as const,
  () => {
    const previous = activeCell.value;
    const next = {
      row: Math.min(Math.max(previous.row, -1), Math.max(props.rows.length - 1, -1)),
      col: Math.min(previous.col, colCount.value - 1),
    };
    activeCell.value = next;
    // A shrink that moves the active cell strands real focus too: the focused
    // cell unmounts, focus falls to <body>, and onFocusin — which only hears
    // focus arriving inside the grid — never learns. The clamped cell is
    // within the surviving matrix, so it exists to take focus back.
    if (
      (previous.row !== next.row || previous.col !== next.col) &&
      table.value?.contains(document.activeElement)
    ) {
      focusCell(next.row, next.col);
    }
  },
);

const table = ref<HTMLElement | null>(null);
const region = ref<HTMLElement | null>(null);

function focusCell(row: number, col: number): void {
  activeCell.value = { row, col };
  table.value?.querySelector<HTMLElement>(`[data-r='${row}'][data-c='${col}']`)?.focus();
}

function moveTo(row: number, col: number): void {
  focusCell(
    // The floor is -1, not 0, for the same reason the watcher below uses it:
    // with no body row, 0 would clamp onto a row that does not exist and
    // strand the grid with no Tab stop (the header is `data-r="-1"`).
    Math.min(Math.max(row, -1), Math.max(props.rows.length - 1, -1)),
    Math.min(Math.max(col, 0), colCount.value - 1),
  );
}

// Focus can also arrive outside the keymap — a pointer tap lands directly on
// a cell — and the roving Tab stop has to follow whoever actually holds it.
function onFocusin(event: FocusEvent): void {
  const cell = (event.target as Element).closest("[data-r]");
  if (cell) {
    activeCell.value = {
      row: Number(cell.getAttribute("data-r")),
      col: Number(cell.getAttribute("data-c")),
    };
  }
}

function activateCell(row: number, col: number): void {
  if (row < 0) {
    const col_ = props.columns[col - (props.selectable ? 1 : 0)];
    if (col_?.sortable) toggleSort(col_);
    return;
  }
  const target = props.rows[row];
  if (target) emit("rowActivate", target);
}

function spaceCell(row: number, col: number): void {
  if (!props.selectable) return;
  if (row < 0) {
    if (col === 0) toggleAll();
    return;
  }
  const target = props.rows[row];
  if (target) toggleRow(target);
}

function onKeydown(event: KeyboardEvent): void {
  const cell = (event.target as Element).closest("[data-r]");
  if (!cell) return;
  const row = Number(cell.getAttribute("data-r"));
  const col = Number(cell.getAttribute("data-c"));
  const lastRow = Math.max(props.rows.length - 1, 0);
  const lastCol = colCount.value - 1;

  switch (event.key) {
    case "ArrowRight":
      moveTo(row, col + 1);
      break;
    case "ArrowLeft":
      moveTo(row, col - 1);
      break;
    case "ArrowDown":
      moveTo(row + 1, col);
      break;
    case "ArrowUp":
      moveTo(row - 1, col);
      break;
    case "Home":
      event.ctrlKey || event.metaKey ? moveTo(0, 0) : moveTo(row, 0);
      break;
    case "End":
      event.ctrlKey || event.metaKey ? moveTo(lastRow, lastCol) : moveTo(row, lastCol);
      break;
    case "Enter":
      activateCell(row, col);
      break;
    case " ":
      spaceCell(row, col);
      break;
    default:
      return;
  }
  event.preventDefault();
}

// ---------- scroll region (Table's mechanism, verbatim in spirit) ----------

// The region is focusable only while it can actually scroll: a Tab stop that
// never moves is a dead one. Overflow is measured, not assumed.
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
  <!-- A scroll container, not the table itself, for the reason Table's
       wrapper documents: a wide grid overflows its region instead of
       stretching the page. -->
  <div
    ref="region"
    role="region"
    :aria-label="caption ?? text.region"
    :tabindex="scrollable ? 0 : undefined"
    class="w-full overflow-x-auto rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:shadow-halo"
  >
    <!-- Roving focus ring, not focus-visible: the moves that matter here are
         programmatic (arrow keys), and a ring that only answers
         focus-visible hides the one thing a grid must never hide — which
         cell holds focus. -->
    <!-- tabindex="-1" marks the interactive grid focusable without adding a
         Tab stop: the cells own the single roving stop, the container is
         only a target for programmatic/assistive-tech focus. -->
    <table
      ref="table"
      role="grid"
      tabindex="-1"
      :data-density="density"
      class="w-full border-collapse text-left text-sm focus:outline-none [&_th]:border-b [&_th]:border-border-strong [&_th]:px-3 [&_th]:py-2.5 [&_th]:text-xs [&_th]:font-semibold [&_th]:text-muted-foreground [&_th]:whitespace-nowrap [&_td]:border-b [&_td]:border-border [&_td]:px-3 [&_td]:align-top [&_td]:text-foreground [&[data-density='comfortable']_td]:py-3 [&[data-density='compact']_td]:py-1.5 [&[data-density='compact']_th]:py-1.5 [&_tbody_tr:last-child_td]:border-b-0"
      @keydown="onKeydown"
      @focusin="onFocusin"
    >
      <thead>
        <!-- Inside role="grid" the native tr→row mapping does not apply; the
             plugin cannot see the ancestor role, so the explicit role is load-bearing. -->
        <!-- eslint-disable-next-line vuejs-accessibility/no-redundant-roles -->
        <tr role="row">
          <!-- eslint-disable-next-line vuejs-accessibility/no-redundant-roles -->
          <th
            v-if="selectable"
            scope="col"
            role="columnheader"
            data-r="-1"
            :data-c="0"
            :tabindex="isCellActive(-1, 0) ? 0 : -1"
            class="focus:outline-2 focus:-outline-offset-2 focus:outline-ring"
          >
            <Checkbox
              :model-value="selectAllState"
              :aria-label="text.selectAll"
              tabindex="-1"
              @update:model-value="toggleAll()"
            />
          </th>
          <!-- eslint-disable-next-line vuejs-accessibility/no-redundant-roles -->
          <th
            v-for="(col, i) in columns"
            :key="col.key"
            scope="col"
            role="columnheader"
            :aria-sort="ariaSortOf(col)"
            :data-r="-1"
            :data-c="bodyColumnIndex(i)"
            :tabindex="isCellActive(-1, bodyColumnIndex(i)) ? 0 : -1"
            :style="col.width ? { width: col.width } : undefined"
            :class="
              cn(
                headAlignClass(col.align),
                'focus:outline-2 focus:-outline-offset-2 focus:outline-ring',
              )
            "
          >
            <!-- The sort button is reachable only through its header cell:
                 a second Tab stop inside the matrix would break the
                 enter-once contract. Enter on the cell sorts instead. -->
            <button
              v-if="col.sortable"
              type="button"
              tabindex="-1"
              class="inline-flex min-h-6 items-center gap-1 rounded-sm px-1 transition-colors duration-fast ease-out hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:shadow-halo"
              @click="toggleSort(col)"
            >
              <span class="inline-flex items-center gap-1 font-semibold">{{ col.header }}</span>
              <component
                :is="sortIconOf(col)"
                class="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <span class="sr-only">{{ sortWordsOf(col) }}</span>
            </button>
            <template v-else>{{ col.header }}</template>
          </th>
        </tr>
      </thead>
      <tbody>
        <!-- eslint-disable-next-line vuejs-accessibility/no-redundant-roles -->
        <tr
          v-for="(row, r) in rows"
          :key="String(keyOf(row))"
          role="row"
          :aria-selected="selectable ? isSelected(row) : undefined"
          :class="
            cn(
              tableRowVariants({
                state: selectable ? (isSelected(row) ? 'selected' : 'interactive') : 'none',
              }),
            )
          "
          @dblclick="emit('rowActivate', row)"
        >
          <td
            v-if="selectable"
            role="gridcell"
            :data-r="r"
            :data-c="0"
            :tabindex="isCellActive(r, 0) ? 0 : -1"
            class="focus:outline-2 focus:-outline-offset-2 focus:outline-ring"
          >
            <Checkbox
              :model-value="isSelected(row)"
              :aria-label="text.selectRow"
              tabindex="-1"
              @update:model-value="toggleRow(row)"
            />
          </td>
          <td
            v-for="(col, i) in columns"
            :key="col.key"
            role="gridcell"
            :data-r="r"
            :data-c="bodyColumnIndex(i)"
            :tabindex="isCellActive(r, bodyColumnIndex(i)) ? 0 : -1"
            :class="
              cn(
                headAlignClass(col.align),
                'focus:outline-2 focus:-outline-offset-2 focus:outline-ring',
              )
            "
          >
            <!-- @slot One cell's content — a Badge, a RowActions cluster —
                 with `row`, `column` and `value` scoped in. -->
            <slot name="cell" :row="row" :column="col" :value="row[col.key]">
              {{ row[col.key] ?? "" }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
