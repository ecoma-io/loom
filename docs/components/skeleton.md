# Skeleton

A placeholder for content whose layout is already known — a card, an
avatar, a list row — so the page reads as "coming" instead of jumping once
the real content lands. When the layout is not yet known, or all that's
needed is a generic "working" signal, reach for Spinner instead.

<script setup lang="ts">
import { Skeleton } from "@ecoma-io/loom";
import SkeletonDemo from "../../src/primitives/Skeleton/SkeletonDemo.vue";
import skeletonDemoSource from "../../src/primitives/Skeleton/SkeletonDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { Skeleton } from "@ecoma-io/loom";
</script>

<template>
  <Skeleton variant="circle" class="h-10 w-10" />
</template>
```

## Variants

| Variant  | Shape          | Stands in for                 |
| -------- | -------------- | ----------------------------- |
| `text`   | `h-4 rounded`  | a line of text                |
| `circle` | `rounded-full` | an avatar or round icon       |
| `rect`   | `rounded-md`   | an image, thumbnail, or block |

Width and height are the caller's concern via a passthrough `class` (for
example `class="h-10 w-10"` for an avatar, `class="w-2/3"` for a shorter
line of text) — the component sets no fixed size beyond `variant`.

<Demo title="Rebuilding a card's layout" :source="skeletonDemoSource">
  <SkeletonDemo />
</Demo>

## Motion

A faint band of light sweeps a muted base (`animate-shimmer`) — Loom's
shimmer language, kept neutral and low-contrast so a loading page reads as
"coming" rather than busy. Under `prefers-reduced-motion` the sweep stops
outright, leaving a flat muted block; that behaviour comes from the global
reduced-motion rule, not from anything in this component.

## Accessibility

Skeleton carries `aria-hidden="true"` — it is purely a visual shape and does
not announce a loading state to a screen reader on its own. Pair it with a
nearby `aria-live` region, or a `Spinner` with a `label`, wherever the wait
itself needs to be announced.

## API

<!-- @api Skeleton -->
