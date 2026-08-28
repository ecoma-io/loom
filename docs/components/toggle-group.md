# ToggleGroup

A set of toggle actions or filters whose pressed state is the value —
bold/italic/underline, column filters, metric toggles. For picking **one**
value out of several where something is always active, reach for
[SegmentedControl](./segmented-control); for flipping a single boolean,
[Switch](./switch).

<script setup lang="ts">
import { ToggleGroup } from "@ecoma-io/loom";
import ToggleGroupDemo from "../demos/ToggleGroupDemo.vue";
import toggleGroupDemoSource from "../demos/ToggleGroupDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import { ToggleGroup, type ToggleGroupItem } from "@ecoma-io/loom";

const formats = ref<string[]>(["bold"]);
const items: ToggleGroupItem[] = [
  { value: "bold", label: "Bold" },
  { value: "italic", label: "Italic" },
  { value: "underline", label: "Underline", disabled: true },
];
</script>

<template>
  <ToggleGroup v-model="formats" type="multiple" :items="items" aria-label="Formatting" />
</template>
```

## Not SegmentedControl

The two look alike and are deliberately different contracts.
`SegmentedControl` is a radio-like value picker: `role="radio"`, `aria-checked`,
exactly one option active at all times — content and view state, a density or
a theme. `ToggleGroup` is toggle actions and filters: real `<button>`s carrying
`aria-pressed`, zero or more active at once, `null`-able in single mode and a
`string[]` in multiple. Pressed semantics are the point; nothing here is
`aria-checked`, and the Arrow keys move focus only — the value changes on a
click or Space, never on travel.

## Items

Each entry in the `items` array is a `ToggleGroupItem`:

| Field      | Type        | Required | Meaning                                                                                         |
| ---------- | ----------- | -------- | ----------------------------------------------------------------------------------------------- |
| `value`    | `string`    | yes      | Matched against `modelValue`.                                                                   |
| `label`    | `string`    | yes      | Visible label, rendered inside the button.                                                      |
| `icon`     | `Component` | no       | Glyph rendered before the label, hidden from the accessibility tree — the label stays the name. |
| `disabled` | `boolean`   | no       | Disables this button alone, siblings stay toggleable.                                           |
| `testId`   | `string`    | no       | Forwarded to the button's DOM node as a stable test hook.                                       |

## Single and multiple

`type="single"` (the default) models one value or `null` — pressing the pressed
button again clears it, and the model spells that `null`. `type="multiple"`
models a `string[]`; pressing adds the value, pressing again removes it. In
both modes the host owns the model: the component emits, it never mutates.

<Demo title="Single and multiple" :source="toggleGroupDemoSource">
  <ToggleGroupDemo />
</Demo>

## Variant and size

`variant` styles the track the buttons sit in — `secondary` (the default) is
the muted well with a rim, `outline` keeps the rim on the page ground, `ghost`
is bare buttons. A pressed button fills with the primary token and takes
`font-medium` in every variant, so the state is carried by `aria-pressed` plus
fill plus weight — never colour alone.

`size="sm"` is the compressed form for dense chrome — an editor toolbar, a
status bar — with the same explicit 24px target floor per button as
SegmentedControl.

<Demo title="Outline track, sm">
  <ToggleGroup
    :model-value="['bold']"
    type="multiple"
    variant="outline"
    size="sm"
    :items="[
      { value: 'bold', label: 'Bold' },
      { value: 'italic', label: 'Italic' },
    ]"
    aria-label="Formatting"
  />
</Demo>

## Inside a Field or a Fieldset

**A row's label cannot name this control.** `<label for>` names a labelable
element, and ToggleGroup renders a `div[role="group"]`. Name it with the
`aria-label` every example here already carries, or with a
[Fieldset](./fieldset), whose real `<legend>` does the job natively.

Everything else a Field publishes does reach the control: its description and
`invalid` state land on the group element, and a `<Fieldset disabled>` above it
disables every button — including Reka's roving focus, which the fieldset's
native inertness never reaches on its own. An explicit `disabled` prop
overrules the row in both directions, which is why it is
`boolean | undefined` and defaults to `undefined` rather than `false`.

The component has no labels prop: it owns zero localisable strings — the item
labels are the caller's content.

## Keyboard

The group is a single Tab stop — roving tabindex, the currently-reachable
button carries `tabindex="0"`, every other button `-1`. Arrow keys move focus
between buttons and skip disabled ones; they never flip a toggle. Space or
Enter presses the focused button.

## Motion

A pressed button changes fill, weight and shadow with no positional animation,
so there is nothing for `prefers-reduced-motion` to collapse here; the press
itself rides the shared `active:scale-press` token that Loom's global
reduced-motion rule already handles.

## Do / Don't

- Use `ToggleGroup` for independent on/off actions or filters — formatting,
  column visibility, metric selection.
- Don't use it where one option must always be active — that's
  `SegmentedControl`.
- Don't use it for a single boolean in isolation — that's `Switch`.

## API

<!-- @api ToggleGroup -->
