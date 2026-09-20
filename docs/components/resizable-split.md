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
  <ResizableSplit v-model="panelWidth" :min="200" :max="800" :default-width="320">
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

That reservation is a goal the container can make unsatisfiable. In a
container smaller than `min` + 80px, no width honors both bounds and `min`
wins: a drag clamps at the floor, and the end panel gets whatever remains —
possibly nothing. Below `min` + the separator's own 24px the row itself
overflows; sizing the container is the host's job, and the component does not
clip its overflow.

The panel is `side`-relative: `side="left"` (default) puts the resizable
panel first, `side="right"` mirrors the row. The arrow keys act on the
panel's width, not the separator's screen position, so `ArrowLeft` always
narrows the resizable panel and `ArrowRight` always widens it.

## Orientation

`orientation="horizontal"` stacks the two panels and sizes the resizable
panel by height instead of width: `side="left"` reads as the top panel,
`side="right"` as the bottom, and the separator runs across the row. Pass
the height through the same `v-model`:

```vue
<ResizableSplit v-model="panelHeight" orientation="horizontal" :min="120" :max="600">
  <template #panel>…</template>
  <template #content>…</template>
</ResizableSplit>
```

The keyboard map follows the axis — `ArrowUp`/`ArrowDown` resize a horizontal
split — while `Home`/`End` and double-click behave the same either way.

## Direction and cancellation

Under `dir="rtl"` the vertical row mirrors, so a drag flips to keep the
separator tracking the pointer; the keyboard map is unchanged, staying
side-relative. A cancelled drag — `pointercancel`, a browser-issued abort —
discards the gesture: it never fires `resize`, and one last transient
`update:modelValue` carrying the pre-drag size lets the host restore it.

Set `disabled` to make the separator unavailable: it refuses pointer,
keyboard and double-click input, reports `aria-disabled`, and leaves the tab
order. Unset, it defers to an enclosing `<fieldset disabled>`.

### Keyboard

The separator is a single Tab stop following the ARIA separator pattern:

| Key                        | Effect                                             |
| -------------------------- | -------------------------------------------------- |
| `ArrowLeft` / `ArrowRight` | Narrow / widen a vertical split by `step` (10px)   |
| `ArrowUp` / `ArrowDown`    | Narrow / widen a horizontal split by `step` (10px) |
| `Home` / `End`             | Jump to `min` / `max`                              |
| Double-click               | Restore `defaultWidth`                             |

A chord — `Ctrl`, `Alt` or `Meta` held with an arrow — is never a resize: the
separator leaves those keys to the user agent and the screen reader, neither
resizing on them nor preventing their default.

`update:modelValue` fires on every change; `resize` fires once when a gesture
commits — pointer release or a keyboard step — for hosts that persist on
gesture end. A cancelled drag never commits.

## Motion

There is no animation anywhere in the control, so `prefers-reduced-motion`
has nothing to collapse. The hover and focus colour shift on the separator
line is a colour transition, not a layout animation.

## API

<!-- @api ResizableSplit -->
