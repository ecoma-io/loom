# LoadingState

A skeleton-based loading placeholder that shows the expected shape of content
while it loads. Two modes — spinner for short indeterminate waits, skeleton
lines for content-shaped waits — replace the "flash of EmptyState" antipattern:
never show EmptyState before the real result is known.

<script setup lang="ts">
import { LoadingState } from "@ecoma-io/loom";
import LoadingStateDemo from "../demos/LoadingStateDemo.vue";
import loadingStateDemoSource from "../demos/LoadingStateDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { LoadingState } from "@ecoma-io/loom";
</script>

<template>
  <!-- Spinner for short indeterminate waits -->
  <LoadingState mode="spinner" label="Loading…" />

  <!-- Skeleton for content-shaped waits -->
  <LoadingState mode="skeleton" />

  <!-- Custom skeleton shape via the default slot -->
  <LoadingState mode="skeleton">
    <Skeleton class="h-6 w-48" />
    <Skeleton class="h-4 w-full" />
    <Skeleton class="h-4 w-2/3" />
  </LoadingState>
</template>
```

<Demo title="Spinner and skeleton modes" :source="loadingStateDemoSource">
  <LoadingStateDemo />
</Demo>

## When to show loading vs empty vs error

Three situations look similar and are not:

- **Still loading** → `LoadingState` — never flash `EmptyState` before the real
  result is known. An empty state that flickers and disappears is a short-lived
  lie.
- **No data yet** (first run, or everything was deleted) → `EmptyState` —
  inviting, pointed at the next action.
- **Load failed** → `ErrorState` — that is an error; do not disguise it as
  "nothing here yet".

## Spinner mode is for waits whose shape you do not know

A spinner communicates "something is happening" without implying any particular
content shape. Use it for short, indeterminate waits — a network round-trip, a
single record fetch — where skeleton lines would be a fabrication. The label is
optional; omit it when a spinner-only wait is clear enough.

## Skeleton mode is for waits whose shape you do know

The default skeleton lines approximate paragraph-shaped content (three bars of
varying width). Hosts that know their own layout provide a default slot with the
Skeleton arrangement that matches their real content — a heading row plus two
lines, a card grid, a table — so the placeholder and the loaded result occupy
the same space and the transition is a swap, not a layout shift.

## API

<!-- @api LoadingState -->
