# Slider

One continuous value inside a bounded range, set by dragging. Reach for it when
the range itself is the information — a volume, a ratio, a share of something
whole — because the track shows how much of the whole is taken and a number
does not. A quantity with no meaningful ceiling, such as a coordinate or an
angle, belongs in a [NumberField](./number-field) instead.

The decision that shapes it is the same one NumberField makes:
`update:modelValue` fires on every position the thumb passes through, and
`commit` fires once, at the end of the gesture. A host paints its preview from
the first and writes its history from the second, so one drag across the track
is one undo entry rather than a hundred.

<script setup lang="ts">
import { Slider } from "@ecoma-io/loom";
import SliderDemo from "../../src/primitives/Slider/SliderDemo.vue";
import sliderDemoSource from "../../src/primitives/Slider/SliderDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import { Slider } from "@ecoma-io/loom";

const volume = ref(0.65);
</script>

<template>
  <Slider v-model="volume" aria-label="Volume" @commit="checkpoint" />
</template>
```

## Range

The defaults are `min` 0, `max` 1 and `step` 0.01 — the shape of a ratio, which
is what most sliders carry. Give all three for any other range.

The value is a plain number. Multiple thumbs are deliberately not supported: a
range with two ends is a different control with a different contract, not a
prop on this one.

<Demo title="Range">
  <div class="w-full max-w-xs">
    <Slider :model-value="0.65" aria-label="Volume" />
  </div>
</Demo>

## Transient and committed

`commit` fires on release, and on each keyboard step — a key press has no
separate release to wait for. A drag that ends where it started commits
nothing, because nothing changed.

A cancelled drag commits nothing either. Escape mid-drag, or a browser-issued
`pointercancel`, emits one last transient value carrying the committed one, so
a live preview snaps back to where the gesture began.

## Keyboard

Left and right arrows step by `step`, Home and End jump to the bounds, and the
thumb carries the focus ring. Give the slider a label: it has no text of its
own, so `aria-label` or `aria-labelledby` is what names it, and both land on
the thumb rather than on the box around it.

<Demo title="Every state" :source="sliderDemoSource">
  <SliderDemo />
</Demo>

## Disabled

A disabled slider dims, refuses the pointer and leaves the tab order, so it can
neither be dragged nor focused.

<Demo title="Disabled">
  <div class="w-full max-w-xs">
    <Slider :model-value="0.3" disabled aria-label="Cache ceiling" />
  </div>
</Demo>

## API

<!-- @api Slider -->
