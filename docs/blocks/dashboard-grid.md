# DashboardGrid

A self-reflowing CSS grid for a dashboard's panels: it packs in as many
`minTileWidth`-wide tracks as the container allows and drops to fewer columns
as it narrows, with zero Tailwind breakpoints written at either the component
or the call site. That is the decision that makes it a block rather than
something a host assembles itself — a fixed `grid-cols-N` breakpoint set has
to be re-derived for every viewport a panel might sit in, and it is already
wrong the moment the grid lands inside a sidebar narrower than the full
viewport.

<script setup lang="ts">
import { DashboardGrid } from "@ecoma-io/loom";
import DashboardGridDemo from "../../src/blocks/DashboardGrid/DashboardGridDemo.vue";
import dashboardGridDemoSource from "../../src/blocks/DashboardGrid/DashboardGridDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { DashboardGrid, Surface } from "@ecoma-io/loom";
</script>

<template>
  <DashboardGrid min-tile-width="14rem" gap="md">
    <Surface v-for="kpi in kpis" :key="kpi.label">{{ kpi.label }}</Surface>
  </DashboardGrid>
</template>
```

## `auto-fit` + `minmax`, not `grid-cols-N` per breakpoint

The grid's `grid-template-columns` is
`repeat(auto-fit, minmax(min(100%, minTileWidth), 1fr))`. The column count is
recomputed from the container's own width, so the same grid reflows
identically whether it sits full-bleed on an ultra-wide monitor or squeezed
into a workspace sidebar. `min(100%, …)` floors the track at the container
width, so a tile never forces horizontal overflow on a container narrower
than `minTileWidth` itself.

<Demo title="KPI row and wider panels" :source="dashboardGridDemoSource">
  <DashboardGridDemo />
</Demo>

## A wide panel uses `col-span-*`, not a prop

`DashboardGrid` does not count or track how many panels it holds, so a panel
spanning multiple tracks is the panel's own job: add `sm:col-span-2` or
similar to its wrapper at the call site, as the "Recent activity" panel does
above. That reuses a mechanism Tailwind already has instead of inventing a
`span` prop for something CSS grid already does.

## The gap step is `Surface`'s pad scale, one notch tighter below `sm`

`gap` takes the same three steps as `Surface`'s `pad` prop (`sm` 12px ·
`md` 16px · `lg` 24px), so a host never has to remember a second spacing
scale. Below the `sm` breakpoint every step drops one notch (8 / 12 / 16px):
at phone width the grid is already a single column, so the documented gap
between stacked tiles buys no separation the tile borders do not already
give — it only pushes the next tile further off screen.

## API

<!-- @api DashboardGrid -->
