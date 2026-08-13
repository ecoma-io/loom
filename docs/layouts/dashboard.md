# Dashboard

A dashboard shell: optional sidebar + auto-reflowing tile grid for panels,
with an optional aside for supplementary metrics on ultrawide viewports.

The layout composes three patterns into a single responsive shell. The
innermost is the auto-fit tile grid — the column count derives from the
container's own width, so the same grid reflows inside a sidebar-narrowed
workspace and full-bleed on an ultra-wide monitor, with zero Tailwind
breakpoints authored at the call site. The sidebar and aside use the Every
Layout "Sidebar" flex-wrap technique, so each collapses intrinsically when
the container is too narrow. The header slot is full-width, above the
sidebar+grid row.

<script setup lang="ts">
import { Dashboard } from "@ecoma-io/loom";
import DashboardDemo from "../../src/layouts/Dashboard/DashboardDemo.vue";
import dashboardDemoSource from "../../src/layouts/Dashboard/DashboardDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { Dashboard } from "@ecoma-io/loom";
</script>

<template>
  <Dashboard minTileWidth="14rem" gap="md">
    <template #header>
      <header>App header</header>
    </template>

    <template #sidebar>
      <nav>Navigation</nav>
    </template>

    <PanelTile />
    <PanelTile />
    <PanelTile />
  </Dashboard>
</template>
```

## Responsive behaviour

| Viewport | Sidebar                  | Grid                         | Aside              |
| -------- | ------------------------ | ---------------------------- | ------------------ |
| Mobile   | Stacks above grid        | Single column                | Hidden             |
| Tablet   | Stacks above grid        | 2 columns                    | Hidden             |
| Desktop  | Side-by-side (flex-wrap) | Auto-fit from `minTileWidth` | Hidden             |
| 2xl+     | Side-by-side             | Auto-fit, wider tiles        | Side metrics panel |

The sidebar collapses intrinsically via flex-wrap — no media query or
JavaScript. When the grid area cannot honour its `min-width: 50%`, the
sidebar wraps to full-width and stacks above the grid.

The aside slot is gated behind the `2xl` breakpoint: supplementary metrics
are a luxury that only wide desktops can afford. Below that width the grid
takes the full width, preventing a cramped two-panel layout.

## Min tile width

The narrowest a tile may get before the grid drops to fewer columns. Any
valid CSS length — `"14rem"`, `"240px"`, `"20ch"`. Default: `"16rem"`.

The `minmax` lower bound is wrapped in `min(100%, …)` so a tile never
forces horizontal overflow on a container narrower than `minTileWidth`
itself.

## Gap

The same scale Grid and DashboardGrid use:

| Step | Below `sm` | From `sm` up |
| ---- | ---------- | ------------ |
| `sm` | `gap-2`    | `gap-3`      |
| `md` | `gap-3`    | `gap-4`      |
| `lg` | `gap-4`    | `gap-6`      |

## Slots

| Slot      | Purpose                                         |
| --------- | ----------------------------------------------- |
| `header`  | Full-width top bar, above the sidebar+grid row  |
| `sidebar` | Side navigation (optional, intrinsically wraps) |
| default   | Tile grid content                               |
| `aside`   | Supplementary metrics, visible from `2xl` up    |

<Demo title="Dashboard" :source="dashboardDemoSource">
  <DashboardDemo />
</Demo>

## API

<!-- @api Dashboard -->
