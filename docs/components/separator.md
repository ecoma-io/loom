# Separator

A hairline that divides two content groups, visually and — when it is the
only boundary between them — semantically. It is not a spacing tool: reach
for `gap` or a margin when all you need is distance, and reach for this only
when a visible line belongs there.

<script setup lang="ts">
import { Separator } from "@ecoma-io/loom";
import SeparatorDemo from "../../src/primitives/Separator/SeparatorDemo.vue";
import separatorDemoSource from "../../src/primitives/Separator/SeparatorDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { Separator } from "@ecoma-io/loom";
</script>

<template>
  <Separator />
</template>
```

## Orientation

`vertical` needs a parent with a defined height to stretch into (`h-*` or
`items-stretch`) — the hairline fills it (`self-stretch`) but has nothing to
fill without one.

<Demo title="Both orientations" :source="separatorDemoSource">
  <SeparatorDemo />
</Demo>

## Decorative

`decorative` defaults to `true`, which drops `role="separator"` for a screen
reader — the right choice next to content that already has its own
structure, such as adjacent headings. Set it to `false` only when the line
is the sole semantic boundary between two regions that have no other
landmark.

## API

<!-- @api Separator -->
