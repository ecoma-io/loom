# Center

Centered content with a max-width constraint and responsive gutters. Critical
for ultra-wide viewports, where content that stretches to infinity is
unreadable — extra viewport goes to intentional whitespace, never to
stretching lines of text or card grids.

<script setup lang="ts">
import { Center } from "@ecoma-io/loom";
import CenterDemo from "../../src/composition/Center/CenterDemo.vue";
import centerDemoSource from "../../src/composition/Center/CenterDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { Center } from "@ecoma-io/loom";
</script>

<template>
  <Center maxWidth="prose" gutter>
    <p>Long-form readable content.</p>
  </Center>
</template>
```

## Max-width

Names readable intent rather than a pixel value:

| Value   | Width   | Use for                         |
| ------- | ------- | ------------------------------- |
| `sm`    | `24rem` | Narrow sidebars, compact panels |
| `md`    | `28rem` | Form columns                    |
| `lg`    | `32rem` | General content (default)       |
| `xl`    | `36rem` | Wider content panels            |
| `prose` | ~65ch   | Long-form readable text         |

## Gutters

Horizontal padding that widens at wider breakpoints: `px-4` below `sm`,
`px-6` from `sm` up, and `px-8` from `3xl` (ultra-wide). On by default; set
`:gutter="false"` when the content manages its own padding.

<Demo title="Center" :source="centerDemoSource">
  <CenterDemo />
</Demo>

## API

<!-- @api Center -->
