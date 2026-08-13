# Split

Two-panel layout with intrinsic collapse. Split places a side panel and a
content area side by side above a `collapseAt` width, and stacks them
vertically below it. No media queries — the layout wraps when the container
is too narrow.

<script setup lang="ts">
import { Split } from "@ecoma-io/loom";
import SplitDemo from "../../src/composition/Split/SplitDemo.vue";
import splitDemoSource from "../../src/composition/Split/SplitDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { Split } from "@ecoma-io/loom";
</script>

<template>
  <Split minSideWidth="16rem" gap="md">
    <template #side>
      <nav>Navigation</nav>
    </template>
    <main>Content</main>
  </Split>
</template>
```

## How the intrinsic collapse works

Split uses `flex-wrap`: the content area demands at least 50% of the
container width (`min-width: 50%`), and the side panel has a fixed
`min-width`. When the container is too narrow to fit both, the second panel
wraps to a new line and both take full width — no media query needed, and it
works identically inside any container.

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

<Demo title="Split" :source="splitDemoSource">
  <SplitDemo />
</Demo>

## API

<!-- @api Split -->
