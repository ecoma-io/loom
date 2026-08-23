# Table

A semantic data table: real `<thead>/<tbody>/<tfoot>` markup you compose,
with the hairline grid, density and states owned once by the component.
This is a table, not a grid — no virtualization, column resizing or pinned
columns; those are application concerns.

<script setup lang="ts">
import { Table } from "@ecoma-io/loom";
import TableDemo from "../demos/TableDemo.vue";
import tableDemoSource from "../demos/TableDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { Table, TableRow, TableHead, TableCell } from "@ecoma-io/loom";
</script>

<template>
  <Table caption="Service builds this week">
    <thead>
      <TableRow>
        <TableHead>Service</TableHead>
        <TableHead align="right" sortable>Builds</TableHead>
      </TableRow>
    </thead>
    <tbody>
      <TableRow interactive>
        <TableCell>api</TableCell>
        <TableCell align="right">12</TableCell>
      </TableRow>
    </tbody>
  </Table>
</template>
```

## Composition

The wrapper renders a scrollable region named by its `caption` (a real
`<caption>`, visually hidden) so a wide table overflows its region instead of
stretching the page — and the region stays keyboard-reachable, as axe's
scrollable-region rule expects. Rows, headers and cells are components:
`TableRow` carries the row states, `TableHead` declares `scope="col"`
association plus optional sorting, `TableCell` aligns content. Density is a
wrapper decision (`compact` for chrome-height rows) so one table cannot
disagree with itself.

<Demo title="Sortable builds with selectable rows" :source="tableDemoSource">
  <TableDemo />
</Demo>

## Sorting

`sortable` turns a header into a tri-state control cycling ascending →
descending → none. State lives with the host through `v-model:sort`; omit
the binding and the header cycles on its own while still reporting every
change. The control announces its state in words beside the glyph — chevrons
are shape-only semantics — and sets `aria-sort` for the whole column.

## Row states

- **`interactive`** makes the row a Tab stop that emits `activate` on click
  and on Enter/Space; hover language rides only on it. Presses on real
  controls inside a cell — a RowActions cluster, a link — belong to those
  controls and never activate the row.
- **`selected`** marks the current choice (`aria-selected`) with the primary
  wash — selection never borrows interactivity.
- **`disabled`** drains to muted and stays announced; it refuses activation.

Empty and loading states compose from EmptyState and Skeleton inside the
table's own slots — a table that hides itself when empty takes its caption
out of the document too.

## API

<!-- @api Table -->

### TableRow

<!-- @api TableRow -->

### TableHead

<!-- @api TableHead -->

### TableCell

<!-- @api TableCell -->
