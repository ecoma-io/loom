# Checkbox

A boolean choice that lives inside a form: pick a row in a multi-select list,
agree to terms, select several table rows before acting on them together. For
a setting that takes effect the instant it's touched, with no surrounding
"Save", reach for [Switch](./switch) instead.

<script setup lang="ts">
import { Checkbox } from "@ecoma-io/loom";
import CheckboxDemo from "../../src/primitives/Checkbox/CheckboxDemo.vue";
import checkboxDemoSource from "../../src/primitives/Checkbox/CheckboxDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import { Checkbox } from "@ecoma-io/loom";

const agreed = ref(false);
</script>

<template>
  <Checkbox v-model="agreed" label="I agree to the terms" />
</template>
```

## Checkbox vs Switch

If the action happens the moment the control is pressed, it's a `Switch`. If
the value is only read once a surrounding form is submitted, it's a
`Checkbox`. Reach for `Checkbox` for a single in-form choice or for
multi-select across a list; reach for `Switch` for an immediate setting such
as a notification toggle or a dark-mode flip.

## The indeterminate state

`modelValue="indeterminate"` is a genuine third state, not a styling variant
of checked: `aria-checked` reports `"mixed"` rather than a boolean, and the
control renders a dash glyph instead of a tick. Use it on a parent checkbox
that represents a group where some, but not all, children are selected.
Clicking an indeterminate box moves it to `true` (checked), the same
transition a native parent checkbox makes — never back to unchecked.

<Demo title="All three states">
  <Checkbox :model-value="false" label="Unchecked" />
  <Checkbox :model-value="true" label="Checked" />
  <Checkbox model-value="indeterminate" label="Partially selected" />
</Demo>

## Accessible naming

Two ways to name the control, and exactly one applies per usage:

- Pass `label` — it renders visibly beside the box, and the wrapping
  `<label>` element supplies the accessible name for free.
- No visible label in the layout (a row-selection checkbox in a table cell,
  say) — pass `ariaLabel` or `ariaLabelledby` directly instead.

## Motion

The tick or dash pops in with a scale-in entrance on every state change, and
the box itself squishes slightly on press (`active:scale-90`). The press
transform rides `--ease-spring` for a springy release, while fill and border
color change on the instant `--ease-out` — the same split Button and Switch
use, so a press reads consistently across every interactive primitive. Loom's
global `prefers-reduced-motion` rule collapses both to an instant state
change; nothing here needs its own override.

<Demo title="Disabled">
  <Checkbox :model-value="false" disabled label="Disabled" />
  <Checkbox :model-value="true" disabled label="Disabled, checked" />
</Demo>

<Demo title="Every state" :source="checkboxDemoSource">
  <CheckboxDemo />
</Demo>

## Do / Don't

- Use `Checkbox` for an in-form choice or a multi-select list; use `Switch`
  for a setting that takes effect immediately.
- Always name the control, through `label` or through `ariaLabel`/
  `ariaLabelledby`.
- Don't use `Checkbox` to flip a setting that applies the instant it's
  touched — that's `Switch`.

## API

<!-- @api Checkbox -->
