# Select

Pick one value out of a closed list, through a compact trigger and a popover
listbox. It suits roughly three to fifteen rows where one value is always
chosen — a language, a resolution, a quality preset.

The two neighbours are worth naming, because reaching for Select outside its
range is the common mistake. Two to five options a reader should be able to see
all of at once are better shown than hidden: a segmented control keeps them on
screen. A list long enough that a reader would want to search it wants a
combobox, which is a different control rather than a longer version of this one.

<script setup lang="ts">
import { Select } from "@ecoma-io/loom";
import SelectDemo from "../demos/SelectDemo.vue";
import selectDemoSource from "../demos/SelectDemo.vue?raw";

const languages = [
  { value: "en", label: "English" },
  { value: "vi", label: "Tiếng Việt" },
  { value: "zh", label: "中文" },
  { value: "ja", label: "日本語", disabled: true },
];
</script>

## Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import { Select, type SelectOption } from "@ecoma-io/loom";

const languages: SelectOption[] = [
  { value: "en", label: "English" },
  { value: "vi", label: "Tiếng Việt" },
];

const language = ref("en");
</script>

<template>
  <Select v-model="language" :options="languages" aria-label="Language" />
</template>
```

## Options

An option is `value`, `label`, and an optional `disabled`. `value` is what the
model carries and what `update:modelValue` reports; `label` is what a reader
sees, on the row and on the trigger once it is chosen. Keeping them separate is
what lets the label be translated without the stored value moving.

A `disabled` option still renders. It is present but unchoosable — muted,
skipped by the keyboard, and unresponsive to a click — which is the honest way
to show that a choice exists and is currently out of reach. Dropping the row
instead tells a reader nothing.

Muted, and deliberately not dimmed. The row's label moves to the muted
foreground colour rather than being drawn at half opacity, because a
transparency multiplies the _text_ down with everything else: at 50% the label
measured 3.13:1 against the popover, under the 4.5:1 the rest of the site holds
itself to, and a row nobody can read is a row that tells a reader nothing
either. The colour is a measured 5.76:1 and still visibly lighter than the rows
around it.

<Demo title="Options">
  <div class="w-full max-w-xs">
    <Select :model-value="'en'" :options="languages" aria-label="Language" />
  </div>
</Demo>

## Placeholder

`placeholder` is what the trigger shows while nothing is chosen. It is not an
option: it cannot be selected, and choosing a real row is the only way past it.
A Select with no placeholder and no value shows an empty trigger, so give one
whenever the value can legitimately start unset.

<Demo title="Placeholder">
  <div class="w-full max-w-xs">
    <Select :options="languages" placeholder="Choose a language" aria-label="Language" />
  </div>
</Demo>

## Size

`size` shares its scale with the text input exactly — `sm`, `md` (the default),
`lg` — so a form row mixing a Select beside a text field never comes out uneven.
That shared scale is the reason to change `size` rather than reach past it for
an `h-*` class: a height set directly moves this one control off the scale the
row is aligned to.

<Demo title="Size">
  <div class="flex w-full max-w-xs flex-col gap-3">
    <Select :model-value="'en'" :options="languages" size="sm" aria-label="Language, small" />
    <Select :model-value="'en'" :options="languages" size="md" aria-label="Language, medium" />
    <Select :model-value="'en'" :options="languages" size="lg" aria-label="Language, large" />
  </div>
</Demo>

## Keyboard and screen readers

The trigger is a `role="combobox"` button wired to the list by `aria-expanded`
and `aria-controls`. Arrow keys open it and move between rows, typing a
character jumps to the first row starting with it, Enter chooses, and Escape
closes and returns focus to the trigger. A pointer landing anywhere outside
closes it too.

The active row is tracked by moving real focus onto it, so a screen reader
announces the row itself rather than a description of it.

The trigger has no text of its own until something is chosen, so name it:
`aria-label` or `aria-labelledby` lands on the trigger along with every other
attribute you pass.

## Motion

The list rises in, and its rows arrive one step after another rather than all at
once. The stagger comes from the shared list vocabulary, so a Select opening
beside any other revealed list moves at the same rhythm and caps at the same
depth — a long list never turns into a slow one.

<Demo title="Every state" :source="selectDemoSource">
  <SelectDemo />
</Demo>

## Disabled and invalid

A disabled Select drains and refuses to open: the trigger takes the neutral
fill, its chosen label moves to the muted foreground colour, its border slackens
from `--color-input` to the lighter `--color-border`, and the cursor says
not-allowed. Three channels rather than one — a state told in hue alone is a
state a reader with a colour deficiency does not receive.

What it does **not** do is fade — the trigger is the one node carrying the
chosen value, and what a reader needs from a control they cannot change is
exactly that value. Half opacity took the label to 3.06:1; the drained pair
measures 4.68:1.

Because Select has no read-only state (see below), it rests in two appearances
rather than the three a [TextField](./text-field) has: the trigger goes straight
from available to unavailable, and the lifted fill that marks a value on show
never appears on it.

An invalid one still works: it takes
the destructive border and focus ring and sets `aria-invalid`, which is the same
error language every other form control speaks, so a field reporting an error
looks the same whichever control it holds.

<Demo title="Disabled and invalid">
  <div class="flex w-full max-w-xs flex-col gap-3">
    <Select :model-value="'en'" :options="languages" disabled aria-label="Language, disabled" />
    <Select :options="languages" invalid placeholder="Pick one to continue" aria-label="Language, invalid" />
  </div>
</Demo>

## Inside a Field

Wrapped in a [Field](./field), Select wires itself: the row's id, the id of its
hint or error line, `required`, `invalid`, `disabled` and the name the chosen
value is posted under all arrive from the row, so nothing is written at the call
site.

```vue
<Field label="Language" name="language" error="Pick a language to continue" required>
  <Select v-model="language" :options="languages" />
</Field>
```

`disabled` and `invalid` still win when you set them, in both directions — which
is why both are `boolean | undefined` and default to `undefined` rather than
`false`. `<Select />` says nothing and inherits the row; `<Select :invalid="false" />`
says this one control is fine even though its row is not, and it is obeyed.

Two things are worth knowing about what the row's other answers do here.

**`name` posts through a hidden input, not the trigger.** A trigger is a
button, and a button's `name` is never part of a submission. Reach for the row's
`name` and the chosen value — exactly the value, or the empty string while the
placeholder is showing — is posted under it. Nothing about `v-model` changes;
the input exists only for a surrounding `<form>`.

**A row's `readonly` is ignored, deliberately.** A read-only value is one a
reader may see and copy but not change, and a closed list shows nothing the
trigger is not already showing — so a read-only Select would be a disabled
Select that lies about being reachable. Use `disabled`, or render the chosen
label as text. It follows that a row's `readonly` moves neither the trigger's
fill nor its behaviour: the trigger has two resting appearances, not three.

## API

<!-- @api Select -->
