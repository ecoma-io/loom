# SegmentedControl

Pick one of a small set of mutually exclusive options, all visible at once,
with one always active — a view switcher or a density setting. For a longer
list, or options that need a description, reach for
[RadioGroup](./radio-group) instead; for flipping a single boolean, reach for
[Switch](./switch).

<script setup lang="ts">
import { SegmentedControl } from "@ecoma-io/loom";
import SegmentedControlDemo from "../../src/primitives/SegmentedControl/SegmentedControlDemo.vue";
import segmentedControlDemoSource from "../../src/primitives/SegmentedControl/SegmentedControlDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import { SegmentedControl, type SegmentedControlOption } from "@ecoma-io/loom";

const theme = ref("auto");
const options: SegmentedControlOption[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "auto", label: "Auto" },
];
</script>

<template>
  <SegmentedControl v-model="theme" :options="options" aria-label="Theme" />
</template>
```

## RadioGroup vs SegmentedControl

`SegmentedControl` is a compact, horizontal toggle with short labels, all
visible at once — a view switch or a density setting, typically 2 to 5
options. `RadioGroup` is a vertical list carrying full labels and an
optional description per row. Short labels that need to sit compactly in a
row: reach for `SegmentedControl`. Longer labels, a description per option,
or a place inside a form: reach for `RadioGroup`.

## Options

Each entry in the `options` array is a `SegmentedControlOption`:

| Field      | Type      | Required | Meaning                                                    |
| ---------- | --------- | -------- | ---------------------------------------------------------- |
| `value`    | `string`  | yes      | Matched against `modelValue`.                              |
| `label`    | `string`  | yes      | Visible label, rendered inside the segment.                |
| `disabled` | `boolean` | no       | Disables this segment alone, siblings stay pickable.       |
| `testId`   | `string`  | no       | Forwarded to the segment's DOM node as a stable test hook. |

A disabled segment drains rather than dims. Its cell lifts a rung of the
elevation rhythm — from the track's fill up to the page ground — so it reads as
a hole punched in the track, and its label moves to the muted foreground
colour. A segment is nothing but its label, so there was never anything for
`opacity` to act on except the text: at half opacity an unchecked segment
measured 1.96:1 and a chosen one 3.13:1. Drained, both measure 5.25:1.

When it is the chosen segment that is disabled, the drained cell covers the
raised white thumb, which is the whole signal in one move — the value is still
shown, and it is visibly no longer settable.

Disabling the **whole** control says it once more at the group's own edge: the
track's rim slackens from `--color-input` to the lighter `--color-border`. The
track has no fill left to spend — it already sits on `--color-muted`, the well
every unavailable control in the library drains to — so without the rim a wholly
unavailable control was tellable only cell by cell.

## Size

`size="sm"` is the compressed form for dense chrome — a status bar, a toolbar
— where the default padding and text size would crowd the surrounding
controls.

<Demo title="Default and sm">
  <SegmentedControl
    model-value="cozy"
    :options="[
      { value: 'compact', label: 'Compact' },
      { value: 'cozy', label: 'Cozy' },
      { value: 'roomy', label: 'Roomy' },
    ]"
    aria-label="Density"
  />
  <SegmentedControl
    model-value="cozy"
    size="sm"
    :options="[
      { value: 'compact', label: 'Compact' },
      { value: 'cozy', label: 'Cozy' },
      { value: 'roomy', label: 'Roomy' },
    ]"
    aria-label="Density"
  />
</Demo>

## Inside a Field or a Fieldset

**A row's label cannot name this control.** `<label for>` names a labelable
element, and SegmentedControl renders a `div[role="radiogroup"]` — a
[Field](./field)'s label resolves to it and announces nobody. Name it with the
`aria-label` every example here already carries, or with a
[Fieldset](./fieldset), whose real `<legend>` does the job natively.

```vue
<Fieldset legend="Density">
  <SegmentedControl v-model="density" :options="options" aria-label="Density" />
</Fieldset>
```

Everything else a Field publishes does reach the control: its description,
`name`, `required` and `invalid` land on the group element as
`aria-describedby`, `aria-required` and `aria-invalid`, and the `name` mints the
hidden input a real `<form>` submits.

`disabled` still wins wherever you set it, in both directions, which is why it
is `boolean | undefined` and defaults to `undefined` rather than `false`.

A `<Fieldset disabled>` is the exception, and it wins over the prop the way the
platform does: an `<input :disabled="false">` inside a disabled fieldset is
disabled too, so a segmented control that said the same must not be the one
control that escapes. Each segment is a real `<button>`, so the fieldset already
made the choice unsettable — what it could not reach is Reka's roving focus,
which kept `tabindex="0"` on the `role="radiogroup"` container and left Tab
stopping on an unavailable control. The control now reads the enclosing
fieldset's own attribute and resolves it into the same state its prop feeds.

That read is also what keeps the _appearance_ honest here, and this is the
control where the difference bites: one option may carry `disabled` of its own,
so "a disabled button is inside this track" and "this track is unavailable" are
different facts, and only the fieldset says the second. A rule keyed off the
first would slacken the whole group's rim because one segment of five is
unavailable.

There is no `readonly` here, and a row's is ignored rather than approximated.
Each segment is a `<button role="radio">` with no native read-only state to put
it in, and one segment is always active — so a read-only segmented control
would only ever be a disabled one showing an answer.

## Keyboard

The group is a single Tab stop, not one per segment — this is roving
tabindex: the currently-reachable segment carries `tabindex="0"`, every other
segment carries `tabindex="-1"`. Arrow keys move both the reachable segment
and the selection; because the group is horizontal, only the horizontal
arrows act, the vertical ones are ignored.

## Motion

One shared indicator pill slides behind whichever segment is active, rather
than each segment animating its own background. Its position is measured
live off the DOM — the `offsetLeft`/`offsetWidth` of the checked segment —
and re-measured through a `ResizeObserver`, so variable-width labels and the
`sm` size stay correct with no per-size indicator logic. The slide runs on
`--duration-fast` paired with `--ease-spring`, both on the `left` and the
`width` transition; the segment's own text merely changes color and weight
on `--ease-out`, since the indicator carries the motion. Loom's global
`prefers-reduced-motion` rule collapses the slide to an instant jump; nothing
here needs its own override.

<Demo title="Every state" :source="segmentedControlDemoSource">
  <SegmentedControlDemo />
</Demo>

## Do / Don't

- Use `SegmentedControl` for 2 to 5 mutually exclusive, short-labeled
  options where one is always active — a color mode or a density level.
- Don't use `SegmentedControl` for more than a handful of options, or for
  options with long labels — reach for a `Select` instead.
- Don't use `SegmentedControl` to flip a single boolean — that's `Switch`.

## API

<!-- @api SegmentedControl -->
