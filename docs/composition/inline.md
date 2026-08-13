# Inline

Horizontal flow with wrap, consistent gap. Inline is a flex row that wraps
naturally at the container edge and tightens its gutter one step below the
`sm` breakpoint.

<script setup lang="ts">
import { Inline } from "@ecoma-io/loom";
import InlineDemo from "../../src/composition/Inline/InlineDemo.vue";
import inlineDemoSource from "../../src/composition/Inline/InlineDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { Inline } from "@ecoma-io/loom";
</script>

<template>
  <Inline gap="md">
    <span>Item one</span>
    <span>Item two</span>
  </Inline>
</template>
```

## Why a component, not `flex flex-row flex-wrap gap-4`

The same reasons as Stack: the responsive gap is the component's job, the
`align` prop names intent, and `wrap` controls line-wrapping behaviour.

## Gap

The same scale Stack and DashboardGrid use:

| Step | Below `sm` | From `sm` up |
| ---- | ---------- | ------------ |
| `sm` | `gap-2`    | `gap-3`      |
| `md` | `gap-3`    | `gap-4`      |
| `lg` | `gap-4`    | `gap-6`      |

## Wrap

Items wrap to new lines by default (`wrap: true`). Set `:wrap="false"` when
items must stay on a single line — combine with `overflow-x-auto` for
horizontal scrolling.

## Align

Cross-axis alignment of children:

| Value      | Behaviour                     |
| ---------- | ----------------------------- |
| `stretch`  | Fill the row height (default) |
| `start`    | Align to the top edge         |
| `center`   | Center within the row         |
| `end`      | Align to the bottom edge      |
| `baseline` | Align to the text baseline    |

<Demo title="Inline" :source="inlineDemoSource">
  <InlineDemo />
</Demo>

## API

<!-- @api Inline -->
