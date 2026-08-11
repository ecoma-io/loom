# ColorPicker

Choose one colour, as a hex string. A saturation/brightness area, a hue slider,
an editable hex field, and an optional row of preset swatches. Reach for it
when the colour itself is the value being authored — a label colour, a chart
series, a theme override — because none of those has a right answer to offer in
a list.

When the choice really is a small closed set, name the options instead: a
[Select](./select) or a [RadioGroup](./radio-group) can say "critical" and
"resolved" where a picker can only say `#b5502a`. A picker offers sixteen
million answers, which is the wrong control for a question with six.

The model value is a plain `#rrggbb` string, and **there is no alpha channel in
this version** — a value carrying one is parsed, but its transparency is
dropped rather than preserved. If a value that cannot be parsed at all arrives,
the picker falls back to `#000000` instead of throwing inside a render.

<script setup lang="ts">
import { ColorPicker } from "@ecoma-io/loom";
import ColorPickerDemo from "../../src/primitives/ColorPicker/ColorPickerDemo.vue";
import colorPickerDemoSource from "../../src/primitives/ColorPicker/ColorPickerDemo.vue?raw";

const brand = ["#1f3a5f", "#3366cc", "#2f7a5b", "#b5502a", "#8a2f4d", "#4b4b4b"];
</script>

## Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import { ColorPicker } from "@ecoma-io/loom";

const labelColour = ref("#3366cc");
</script>

<template>
  <ColorPicker v-model="labelColour" aria-label="Label colour" @commit="checkpoint" />
</template>
```

The picker has no text of its own, so `aria-label` or `aria-labelledby` is what
names it. Both land on the group that holds the four controls; the controls
inside are already named individually.

## The value

Everything emitted is `#rrggbb`, lower case, whatever the parts were driven
with. The hex field accepts more than it emits — `rgb()`, `hsl()` and the
three-digit `#rgb` shorthand are all parsed — and normalises to the six-digit
form on the way out, so a host never has to handle two spellings of one colour.

Text that is not a colour at all is reverted to the current value when the
field is left. Nothing partially typed ever reaches the model.

<Demo title="The value">
  <div class="w-full max-w-xs">
    <ColorPicker model-value="#3366cc" aria-label="Label colour" />
  </div>
</Demo>

## Presets

`swatches` takes the colours a product already cares about. Omit the prop and
no row is rendered at all; a preset that cannot be parsed is dropped rather
than shown as an unusable square, and if nothing survives that, the row is
omitted the same way.

Each swatch is named from its own value — "vibrant red", "dark blue" — so a
preset is a described choice rather than a coloured square with nothing to
announce. The chosen one is marked with `aria-selected` as well as with a ring,
because a selection carried only by colour is invisible to the readers most
likely to need the help.

<Demo title="Presets">
  <div class="w-full max-w-xs">
    <ColorPicker model-value="#b5502a" :swatches="brand" aria-label="Chart series colour" />
  </div>
</Demo>

## Transient and committed

The contract is [Slider](./slider)'s. `update:modelValue` fires on every colour
a gesture passes through, so a host can paint a live preview; `commit` fires
once at the end of one — a drag release, an arrow step on either thumb or in
the hex field, the field being left after typing, a preset being clicked. One
drag across the area is therefore one undo entry rather than a hundred.

A gesture that ends on the colour it started from commits nothing, because
nothing changed. That covers the click that lands on the thumb, the arrow key
pressed at the edge of an axis, and the same hex retyped.

## Keyboard and screen readers

Four controls, four tab stops — the preset row is one of them, not one per
swatch.

| Key                | Behaviour                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| `Tab`              | Area thumb → hue thumb → hex field → preset row                                                     |
| `←` / `→`          | Area: saturation by one. Hue slider: one degree. Preset row: the previous or next swatch            |
| `↑` / `↓`          | Area: brightness by one. Hex field: the whole value up or down by one, which walks the blue channel |
| `Shift` + an arrow | In the area, the same step ten at a time                                                            |
| `PgUp` / `PgDn`    | Brightness in the area, and the hex value in the field, ten at a time                               |
| `Home` / `End`     | Saturation ten at a time in the area; the ends of the range on the hue slider and in the hex field  |
| `Enter`            | In the hex field, applies what is typed; in the preset row, chooses the highlighted swatch          |
| `Space`            | Chooses the highlighted preset                                                                      |

Both thumbs are `role="slider"`, and each announces the axes it moves rather
than the colour it sits on: "Saturation, Brightness — Saturation 60, Brightness
80" for the area, "Hue — 220" for the slider. The area around them carries
`role="application"`, which hands every key press straight to it instead of to
the screen reader's own navigation, so it is named for what it is.

The hex value is always on screen as text, and that is deliberate: a colour
picker that communicates only in colour is the definitional failure of this
control. Every state it has — the current value, a preset selection, being
disabled — has a second channel that is not a hue.

<Demo title="Every state" :source="colorPickerDemoSource">
  <ColorPickerDemo />
</Demo>

## Motion

Only the thumbs move. Both press on `duration-fast` with `ease-spring`, the
same released feel Slider's thumb has, and the preset swatches answer a hover
and a press the same way.

Nothing else animates. The area's gradient and the hue track repaint as the
value changes and are never transitioned into place — a picker whose surface
eases toward the colour you just chose is fighting the person reading it, and
at drag speed it would lag behind the pointer.

## Disabled

A disabled picker dims, refuses the pointer, the arrow keys and the field, and
carries `aria-disabled` so the state is announced rather than only seen.

<Demo title="Disabled">
  <div class="w-full max-w-xs">
    <ColorPicker model-value="#1f3a5f" :swatches="brand" disabled aria-label="Locked colour" />
  </div>
</Demo>

## API

<!-- @api ColorPicker -->
