# Stack

Vertical flow with consistent, responsive gap. Stack is a flex column that
tightens its gutter one step below the `sm` breakpoint, where stacked items
have no room to waste on air.

<script setup lang="ts">
import { Stack } from "@ecoma-io/loom";
import StackDemo from "../demos/StackDemo.vue";
import stackDemoSource from "../demos/StackDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { Stack } from "@ecoma-io/loom";
</script>

<template>
  <Stack gap="md">
    <div>Item one</div>
    <div>Item two</div>
  </Stack>
</template>
```

## Why a component, not `flex flex-col gap-4`

Three reasons Stack exists as a component:

1. **Responsive gap is the component's job.** Every call site that writes
   `gap-3 sm:gap-4` is a call site that will forget the `sm:` half. Stack
   handles it once.
2. **Alignment intent, not utility recall.** `align="center"` beats
   remembering that the flex utility is `items-center`.
3. **Separator slot.** A `<Separator />` between items is a repeated
   `v-for` + `v-if` pattern Stack avoids by making the separator a
   sibling in the slot.

## Gap

The same scale DashboardGrid uses — the value each step names applies from
`sm` up, and drops one notch below it:

| Step | Below `sm` | From `sm` up |
| ---- | ---------- | ------------ |
| `sm` | `gap-2`    | `gap-3`      |
| `md` | `gap-3`    | `gap-4`      |
| `lg` | `gap-4`    | `gap-6`      |

## Align

Cross-axis alignment of children:

| Value     | Behaviour                      |
| --------- | ------------------------------ |
| `stretch` | Fill the stack width (default) |
| `start`   | Align to the leading edge      |
| `center`  | Center within the stack        |
| `end`     | Align to the trailing edge     |

<Demo title="Stack" :source="stackDemoSource">
  <StackDemo />
</Demo>

## API

<!-- @api Stack -->
