# RadioGroup

A vertical list of mutually exclusive options, each with a visible label and
an optional description — for a longer or explained choice, such as a plan
picker or a settings list. For a compact horizontal toggle among a handful of
short, always-visible options, reach for [SegmentedControl](./segmented-control)
instead.

<script setup lang="ts">
import { RadioGroup } from "@ecoma-io/loom";
import RadioGroupDemo from "../../src/primitives/RadioGroup/RadioGroupDemo.vue";
import radioGroupDemoSource from "../../src/primitives/RadioGroup/RadioGroupDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import { RadioGroup, type RadioOption } from "@ecoma-io/loom";

const plan = ref("pro");
const options: RadioOption[] = [
  { value: "free", label: "Free", description: "For trying things out." },
  { value: "pro", label: "Pro", description: "For a growing team." },
];
</script>

<template>
  <RadioGroup v-model="plan" :options="options" />
</template>
```

## RadioGroup vs SegmentedControl

`SegmentedControl` is a compact, horizontal toggle with short labels, all
options visible at once — a view switch or a density setting. `RadioGroup` is
a vertical list carrying full labels, and optionally a description per row —
a plan picker, a long or explained setting, a choice embedded in a form.
Short labels, few options, needs to sit compactly in a toolbar: reach for
`SegmentedControl`. Longer labels, a description per option, or a place
inside a form or settings page: reach for `RadioGroup`.

## Options

Each entry in the `options` array is a `RadioOption`:

| Field         | Type      | Required | Meaning                                          |
| ------------- | --------- | -------- | ------------------------------------------------ |
| `value`       | `string`  | yes      | Matched against `modelValue`.                    |
| `label`       | `string`  | yes      | Visible label, rendered beside the control.      |
| `description` | `string`  | no       | Secondary text, rendered small under the label.  |
| `disabled`    | `boolean` | no       | Disables this row alone, siblings stay pickable. |

<Demo title="With descriptions">
  <RadioGroup
    model-value="pro"
    :options="[
      { value: 'free', label: 'Free', description: 'For trying things out.' },
      { value: 'pro', label: 'Pro', description: 'For a growing team.' },
      { value: 'legacy', label: 'Legacy', description: 'No longer sold.', disabled: true },
    ]"
  />
</Demo>

## Accessible naming

Each row names itself: the `<label>` wrapping the item and its label text
supplies the accessible name, so no separate `aria-label` is needed per row.
Set `name` when the group posts inside a real, plain HTML `<form>` submit —
it becomes the submitted field name.

## Inside a Field or a Fieldset

**A row's label cannot name this group.** `<label for>` names a labelable
element, and RadioGroup renders a `div[role="radiogroup"]` — a [Field](./field)'s
label resolves to it and announces nobody. Name the group with a
[Fieldset](./fieldset), whose real `<legend>` does the job natively, or give the
group an `aria-label`/`aria-labelledby` of its own.

```vue
<Fieldset legend="Plan" hint="Change it at any time.">
  <RadioGroup v-model="plan" :options="options" name="plan" />
</Fieldset>
```

Everything else a Field publishes does reach the group: its description, its
`name`, `required` and `invalid` land on the group element as
`aria-describedby`, `aria-required` and `aria-invalid`. `name` is the one key
both this component and the row can answer, and this component wins when it is
set — one concept, not two that can disagree.

`disabled` still wins wherever you set it, in both directions, which is why it
is `boolean | undefined` and defaults to `undefined` rather than `false`.

There is no `readonly` here, and a row's is ignored rather than approximated.
Each option is a `<button role="radio">` with no native read-only state to put
it in, and a group whose options cannot be picked is a disabled group.

## Keyboard

The group is a single Tab stop, not one per option — this is roving
tabindex: the currently-reachable option carries `tabindex="0"`, every other
option carries `tabindex="-1"`. Arrow keys move both the reachable option and
the selection between rows; because the group is vertical, only the vertical
arrows act, the horizontal ones are ignored.

## Motion

The selected dot pops in with a scale-in entrance, and the ring itself
squishes slightly on press (`active:scale-90`), the transform riding
`--ease-spring` while the border color change stays on the instant
`--ease-out` — the same press language as Checkbox and Switch. Loom's global
`prefers-reduced-motion` rule collapses this to an instant state change.

<Demo title="Every state" :source="radioGroupDemoSource">
  <RadioGroupDemo />
</Demo>

## Do / Don't

- Use `RadioGroup` when labels are long or a description belongs beside each
  option.
- Use `SegmentedControl` when the options are short and fit compactly in a
  single row.
- Don't use `RadioGroup` for a long list — reach for a `Select` instead.

## API

<!-- @api RadioGroup -->
