# ScrollReel

Horizontal scrolling strip with scroll-snap. Touch-friendly on mobile,
keyboard-navigable on desktop — arrow keys scroll between snap-aligned
items, `Home`/`End` jump to the start or end of the strip.

<script setup lang="ts">
import { ScrollReel } from "@ecoma-io/loom";
import ScrollReelDemo from "../../src/composition/ScrollReel/ScrollReelDemo.vue";
import scrollReelDemoSource from "../../src/composition/ScrollReel/ScrollReelDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { ScrollReel } from "@ecoma-io/loom";
</script>

<template>
  <ScrollReel snap="start" gap="md">
    <div class="w-40 shrink-0 snap-start">Item one</div>
    <div class="w-40 shrink-0 snap-start">Item two</div>
  </ScrollReel>
</template>
```

## Snap alignment

| Value    | Behaviour                                |
| -------- | ---------------------------------------- |
| `start`  | Items snap to their start edge (default) |
| `center` | Items snap to the center of the viewport |
| `end`    | Items snap to their end edge             |
| `none`   | No snap — items scroll freely            |

Each child needs its own `snap-start` / `snap-center` / `snap-end` class
to match the reel's `snap` prop. Without it, scroll-snap has no alignment
point to snap to.

## Keyboard navigation

The reel is keyboard-focusable (`tabindex="0"`). Once focused:

- **←** / **→** — scroll to the previous / next snap-aligned child
- **Home** / **End** — jump to the start / end of the strip

Without this JavaScript, the browser's default arrow-key behaviour scrolls
by a fixed pixel amount that rarely aligns with snap points, leaving the
strip between two items.

## Gap

The same scale Stack and DashboardGrid use:

| Step | Below `sm` | From `sm` up |
| ---- | ---------- | ------------ |
| `sm` | `gap-2`    | `gap-3`      |
| `md` | `gap-3`    | `gap-4`      |
| `lg` | `gap-4`    | `gap-6`      |

<Demo title="ScrollReel" :source="scrollReelDemoSource">
  <ScrollReelDemo />
</Demo>

## API

<!-- @api ScrollReel -->
