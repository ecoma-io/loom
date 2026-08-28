# DataGrid

The interactive half of [Table](/components/table): Table's visual language —
hairline grid, density, alignment — with the WAI-ARIA [grids
pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/) added. Where Table is
composition (you bring `TableRow`, `TableHead`, `TableCell`), DataGrid is
data-driven: hand it `columns` and `rows` and it renders the whole matrix,
with selection, sortable headers and row activation built in. A table reads;
a grid acts.

<script setup lang="ts">
import DataGridDemo from "../demos/DataGridDemo.vue";
import dataGridDemoSource from "../demos/DataGridDemo.vue?raw";
</script>

<Demo title="Sortable, selectable, keyboard-driven" :source="dataGridDemoSource">
  <DataGridDemo />
</Demo>

## Usage

```vue
<script setup lang="ts">
import { DataGrid } from "@ecoma-io/loom";
import type { DataGridColumn } from "@ecoma-io/loom";

const columns: DataGridColumn[] = [
  { key: "service", header: "Service", sortable: true },
  { key: "builds", header: "Builds", sortable: true, align: "right", width: "6rem" },
];

const rows = [
  { id: "api", service: "api", builds: 12 },
  { id: "web", service: "web", builds: 7 },
];
</script>

<template>
  <DataGrid :columns="columns" :rows="rows" caption="Service builds this week" />
</template>
```

## A grid is not a big table

The distinction the pattern draws is about focus, not density. In a table,
the Tab key walks row by row and the content inside cells is reached the
ordinary way. In a grid, the cell matrix holds **exactly one Tab stop**: Tab
enters and leaves the grid once, and the arrow keys move focus cell to cell
inside it. That contract is what makes Space-select and Enter-activate safe —
keys act on the focused cell because focus, not the pointer, is what a grid
sells.

The keyboard map, straight from the APG grids pattern:

| Key                     | Action                                                                       |
| ----------------------- | ---------------------------------------------------------------------------- |
| `Tab` / `Shift+Tab`     | Enters the grid once, lands on the active cell; leaves it once               |
| Arrow keys              | Move focus one cell, clamped at the edges                                    |
| `Home` / `End`          | First / last cell of the focused row                                         |
| `Ctrl/Cmd+Home` / `End` | First / last cell of the grid                                                |
| `Space`                 | Toggles the focused row's selection (the select-all cell toggles everything) |
| `Enter`                 | Activates the focused row; sorts from a sortable header                      |
| Double-click            | Activates the row, for pointer users                                         |

## Selection

`selectable` adds a checkbox column — one per row plus select-all — and
selection state rides `v-model:selectedRowKeys`. Row identity comes from
`rowKey` (`"id"` by default). The row announces itself (`aria-selected`) and
the select-all control reports the true three-state story: unchecked,
`aria-checked="mixed"` when some rows are selected, checked when all are.
Omit the `v-model` binding and the grid owns the state itself while still
emitting every change.

Cells keep the inner controls out of the Tab order (`tabindex="-1"`) — the
matrix moves are how keyboard users reach them, exactly as the pattern
prescribes.

## Sorting

A `sortable: true` column renders a tri-state header control cycling
ascending → descending → descending → none — the same semantics as
`TableHead`. State lives with the host through `v-model:sort`; omit the
binding and the headers cycle on their own while still reporting every
change through both `update:sort` and `sort-change`. The sorted column
carries `aria-sort`, and the control announces its state in words beside the
glyph — chevrons are shape-only semantics.

## Columns

- **`align`** — `"left"`, `"center"` or `"right"`; numeric columns want
  `"right"`, which also switches the cells to tabular digits so figures
  read down cleanly.
- **`width`** — any CSS width pins the column inside the scrolling region.
- **`density`** — wrapper-level, like Table: `compact` for chrome-height rows.

Cells render `row[column.key]` by default; the `#cell` slot (scoped with
`row`, `column`, `value`) takes over for Badges, links or action clusters.
Headers render `column.header`; the `#header` slot takes over per column.

## Labels

The grid's self-spoken words — the region's fallback name, the two selection
controls, and sort state in words — live in the `dataGrid` vocabulary,
overridable per instance through the `labels` prop or host-wide through
`provideLoomLabels`.

There is no `aria-rowcount` on purpose: every row is in the DOM, so the
count is the DOM's to state. The attribute earns its place the day the grid
virtualizes, not before.

## API

<!-- @api DataGrid -->
