# ResizableSplit

A two-panel split whose separator drags with the pointer and resizes with the
arrow keys. The resizable panel's width is a plain number controlled by
`v-model`, so the host owns persistence — a saved layout is a `v-model` bound
to storage, not a behaviour this primitive duplicates.

Unlike the intrinsic `Split` composition, widening here moves the separator,
not the wrap point: the panels never reflow. Use `Split` when the arrangement
should collapse on its own; use `ResizableSplit` when the host — a trace
waterfall, a mail client, an IDE — has to let the user pick a width that no
media query can predict.

<script setup lang="ts">
import { ResizableSplit } from "@ecoma-io/loom";
import ResizableSplitDemo from "../demos/ResizableSplitDemo.vue";
import resizableSplitDemoSource from "../demos/ResizableSplitDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import { ResizableSplit } from "@ecoma-io/loom";

const panelWidth = ref(320);
</script>

<template>
  <ResizableSplit v-model="panelWidth" :min="200" :max="800" default-width="320">
    <template #panel>…</template>
    <template #content>…</template>
  </ResizableSplit>
</template>
```

<Demo title="Drag the separator" :source="resizableSplitDemoSource">
  <ResizableSplitDemo />
</Demo>

## How resizing works

`min` and `max` clamp every input path — arrow keys, drag, double-click — and
are the same values announced as `aria-valuemin` and `aria-valuemax` on the
separator. A drag never pushes the end panel off the row: the separator
cannot travel past the container's edge minus 80px, whichever bound is
stricter.

The panel is `side`-relative: `side="left"` (default) puts the resizable
panel first, `side="right"` mirrors the row. The arrow keys act on the
panel's width, not the separator's screen position, so `ArrowLeft` always
narrows the resizable panel and `ArrowRight` always widens it.

### Keyboard

The separator is a single Tab stop following the ARIA separator pattern:

| Key                        | Effect                                    |
| -------------------------- | ----------------------------------------- |
| `ArrowLeft` / `ArrowRight` | Narrow / widen the panel by `step` (10px) |
| `Home` / `End`             | Jump to `min` / `max`                     |
| Double-click               | Restore `defaultWidth`                    |

`update:modelValue` fires on every change; `resize` fires once when a gesture
commits — pointer release or a keyboard step — for hosts that persist on
gesture end.

## Motion

There is no animation anywhere in the control, so `prefers-reduced-motion`
has nothing to collapse. The hover and focus colour shift on the separator
line is a colour transition, not a layout animation.

## API

<!-- @api ResizableSplit -->
