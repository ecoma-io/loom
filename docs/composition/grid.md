# Grid

CSS Grid with responsive column count. Grid derives its columns from the
container's own width (`auto-fit` + `minmax`), so the same grid reflows
inside a sidebar-narrowed workspace and full-bleed on an ultra-wide monitor
alike.

<script setup lang="ts">
import { Grid } from "@ecoma-io/loom";
import GridDemo from "../demos/GridDemo.vue";
import gridDemoSource from "../demos/GridDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { Grid } from "@ecoma-io/loom";
</script>

<template>
  <Grid minColWidth="14rem" gap="md">
    <div>Cell one</div>
    <div>Cell two</div>
  </Grid>
</template>
```

## Why `auto-fit`, not `grid-cols-N` breakpoints

A fixed column count needs one breakpoint per host viewport and is already
wrong the moment the grid sits in a sidebar narrower than the viewport.
`auto-fit` + `minmax` recomputes the column count from the container's own
width — it reflows identically everywhere, with zero Tailwind breakpoints
authored here or at the call site.

The `minmax` lower bound is wrapped in `min(100%, …)` so a cell never forces
horizontal overflow on a container narrower than `minColWidth` itself.

## Min column width

The narrowest a column may get before the grid drops to fewer columns. Any
valid CSS length — `"14rem"`, `"240px"`, `"20ch"`. Default: `"16rem"`.

## Gap

The same scale Stack and DashboardGrid use:

| Step | Below `sm` | From `sm` up |
| ---- | ---------- | ------------ |
| `sm` | `gap-2`    | `gap-3`      |
| `md` | `gap-3`    | `gap-4`      |
| `lg` | `gap-4`    | `gap-6`      |

<Demo title="Grid" :source="gridDemoSource">
  <GridDemo />
</Demo>

## API

<!-- @api Grid -->
