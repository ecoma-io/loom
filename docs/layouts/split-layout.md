# SplitLayout

Full-page two-panel layout with intrinsic collapse. SplitLayout places a side
panel and a content area side by side above a `collapseAt` width, and stacks
them vertically below it — with an optional full-width header above. The
intrinsic collapse means no viewport media query: the layout wraps when the
container is too narrow.

<script setup lang="ts">
import { SplitLayout } from "@ecoma-io/loom";
import SplitLayoutDemo from "../demos/SplitLayoutDemo.vue";
import splitLayoutDemoSource from "../demos/SplitLayoutDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { SplitLayout } from "@ecoma-io/loom";
</script>

<template>
  <SplitLayout minSideWidth="16rem" gap="md">
    <template #header>
      <!-- optional full-width header bar -->
    </template>
    <template #side>
      <!-- side panel -->
    </template>
    <!-- main content -->
  </SplitLayout>
</template>
```

<Demo title="SplitLayout" :source="splitLayoutDemoSource">
  <SplitLayoutDemo />
</Demo>

## Side

Controls which side the panel sits on and the stacking order when collapsed:

| Value   | Side  | Collapsed order                      |
| ------- | ----- | ------------------------------------ |
| `left`  | Left  | Panel above, content below (default) |
| `right` | Right | Content above, panel below           |

## Min side width

The minimum width for the side panel. The content area takes the rest. Any
valid CSS length — `"16rem"`, `"240px"`. Default: `"16rem"`.

## Collapse at

The CSS width below which the two panels stack. Default: `"48rem"`.

## Gap

| Step   | Below `sm` | From `sm` up |
| ------ | ---------- | ------------ |
| `sm`   | `gap-2`    | `gap-3`      |
| `md`   | `gap-3`    | `gap-4`      |
| `lg`   | `gap-4`    | `gap-6`      |
| `none` | —          | —            |

## Header slot

The `#header` slot spans the full width of the layout, above the split row.
It renders a `<header>` element only when the slot is provided. Use it for
application header bars that must remain visible regardless of collapse state.

## Responsive behavior

- **Mobile (below collapse width):** side and content stack vertically — side on top when `side="left"`, content on top when `side="right"`
- **Tablet (collapse width and up):** compact split — side panel sits alongside content; content fills remaining space
- **Desktop:** wider gutters at `sm` breakpoint
- **Ultrawide (`3xl`):** panel gutters widen further, extra viewport goes to whitespace rails rather than stretching lines of text

## API

<!-- @api SplitLayout -->
