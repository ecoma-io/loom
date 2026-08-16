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
import SliderDemo from "../demos/SliderDemo.vue";
import sliderDemoSource from "../demos/SliderDemo.vue?raw";
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

The same treatment answers a [Fieldset](./fieldset) that disables its group, and
here it takes a little help. `<fieldset disabled>` reaches `<input>`,
`<button>`, `<select>` and `<textarea>` and stops there, and this control is
built around a `<span role="slider">` — so the platform left it looking
available, keeping its tab stop and still moving its value on Home and End. It
now reads the enclosing fieldset's own `disabled` attribute and resolves it into
the same state its own prop feeds: the same appearance, the same lost tab stop,
the same refused gesture. That is a _read_ of the attribute rather than a second
copy of it, which is why Fieldset still publishes nothing through the
[Field](./field) context — see [Fieldset](./fieldset#disabling-the-group).

## Inside a Field

A [Field](./field) publishes what the row knows, and the slider takes it: the
row's id, the id of its hint or error line, `required` and `invalid` all land on
the **thumb**, because the thumb is the `role="slider"` element and the row is
describing the control, not the box around it. The row's `name` drives a hidden
input, so the value posts under that name in a real `<form>` — as the scalar
this control exposes, not as the `name[0]` an array-shaped slider would submit.

```vue
<Field label="Volume" hint="Applies to every alert" name="volume">
  <Slider v-model="volume" aria-label="Volume" @commit="checkpoint" />
</Field>
```

**A row's label does not name the slider.** `<label for>` names a labelable
element and the thumb is a `span[role="slider"]`, so the row's label resolves to
it and announces nobody. Keep the `aria-label` — or point `aria-labelledby` at
your own visible text — exactly as you would outside a row.

`disabled` still wins wherever you set it, in both directions, which is why it
is `boolean | undefined` and defaults to `undefined` rather than `false`.
`<Slider />` says nothing and takes the row's answer; `<Slider :disabled="false" />`
says this one control is live even though its row is not, and is obeyed.

There is no `readonly`, and a row's is ignored rather than approximated. The
whole control is the drag: a track that shows a value and refuses to move is a
[Progress](./progress) bar wearing a thumb, and one that looks live while
swallowing every gesture is worse than either.

## API

<!-- @api Slider -->
