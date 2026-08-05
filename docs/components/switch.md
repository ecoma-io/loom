# Switch

A boolean setting that takes effect the moment it's touched — no surrounding
form, no "Save" step. For a choice that's only read once a form is submitted,
or for selecting several rows in a list, reach for [Checkbox](./checkbox)
instead.

<script setup lang="ts">
import { Switch } from "@ecoma-io/loom";
import SwitchDemo from "../../src/primitives/Switch/SwitchDemo.vue";
import switchDemoSource from "../../src/primitives/Switch/SwitchDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import { Switch } from "@ecoma-io/loom";

const telemetry = ref(false);
</script>

<template>
  <Switch v-model="telemetry" aria-label="Send anonymous usage data" />
</template>
```

## Naming — no built-in label

Switch renders only the track and the thumb; it carries no label of its own.
A setting row supplies its own visible label text and links it in through
`aria-labelledby` (or, with no visible text nearby, `aria-label` directly).
This keeps the label's layout — inline, above, with a description underneath
— entirely up to the surrounding row rather than fixed by the control.

<Demo title="Named via aria-labelledby">
  <div class="flex items-center gap-3">
    <span id="switch-doc-label" class="text-sm text-foreground">Autosave</span>
    <Switch :model-value="true" aria-labelledby="switch-doc-label" />
  </div>
</Demo>

## Immediate effect

There is no pending state: clicking (or pressing Space or Enter on) the
control emits the flipped value on `update:modelValue` right away, and the
host is expected to apply it immediately — this is what separates Switch
from a form field's `Checkbox`. The component itself never self-updates; it
always waits for the host to write the new `modelValue` back in.

<Demo title="States">
  <Switch :model-value="false" aria-label="Off" />
  <Switch :model-value="true" aria-label="On" />
  <Switch :model-value="false" disabled aria-label="Disabled, off" />
  <Switch :model-value="true" disabled aria-label="Disabled, on" />
</Demo>

## Keyboard

Space toggles the switch through the platform's own native button
activation; Enter is intercepted explicitly by the underlying primitive so it
toggles too, rather than being left to native `<button>` activation (which
does not fire on Enter). Both close the loop in one keystroke — no separate
confirm step.

## Motion

The thumb slides between track ends on the instant `--duration-instant` /
`--ease-out` pair. While pressed, the thumb also plays a squish transform on
`--duration-fast` / `--ease-spring`, and the track's background-color and
shadow change on the same instant `--ease-out` pair as the slide. Loom's
global `prefers-reduced-motion` rule collapses the slide to an immediate
state change rather than an animated one.

<Demo title="Every state" :source="switchDemoSource">
  <SwitchDemo />
</Demo>

## Do / Don't

- Use `Switch` for a setting that takes effect immediately, such as a
  telemetry opt-in or a dark-mode toggle.
- Don't use `Switch` for an action that needs a confirm or submit step —
  that belongs to a form plus a `Button`.
- Don't use `Switch` for a choice among several options — that's
  `SegmentedControl` or a `Select`.

## API

<!-- @api Switch -->
