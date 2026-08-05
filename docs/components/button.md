# Button

The workhorse, and the primitive that carries Loom's press language: hover
lifts by fill rather than by shadow, a press scales down so the feedback is
physical, focus blooms the ring, and a busy button plays a kinetic swap instead
of freezing under a spinner.

<script setup lang="ts">
import { Button } from "@ecoma-io/loom";
import ButtonDemo from "../../src/primitives/Button/ButtonDemo.vue";
import buttonDemoSource from "../../src/primitives/Button/ButtonDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { Button } from "@ecoma-io/loom";
</script>

<template>
  <Button variant="primary" @click="save">Save</Button>
</template>
```

## Variants

Six, and the choice is about weight rather than colour: `primary` is the one
action a screen is asking for, `destructive` is the one it is warning about,
and the four between them step down in emphasis.

<Demo title="Variants">
  <Button variant="primary">Primary</Button>
  <Button variant="secondary">Secondary</Button>
  <Button variant="subtle">Subtle</Button>
  <Button variant="outline">Outline</Button>
  <Button variant="ghost">Ghost</Button>
  <Button variant="destructive">Destructive</Button>
</Demo>

## Sizes

`icon-sm` matches `sm`'s height so a row action lines up with that row's text
controls. At 32px it stays well over the 24px minimum target size of WCAG 2.2
SC 2.5.8, so the density costs nothing in reachability.

<Demo title="Sizes">
  <Button size="sm">Small</Button>
  <Button size="md">Medium</Button>
  <Button size="lg">Large</Button>
  <Button size="icon" aria-label="Play">▶</Button>
  <Button size="icon-sm" variant="ghost" aria-label="Remove row">✕</Button>
</Demo>

## Loading

`loading` locks the button and sets `aria-busy`, then plays three beats: the
label rolls up and out, a progress arc springs in, and `loadingText` rises
last. Both layers share one grid cell, so the button keeps the width of the
wider one and nothing jumps mid-swap. Under `prefers-reduced-motion` the
stagger delay is cancelled and the swap is instant.

Only the layer for the current state is exposed to assistive technology — the
other is `aria-hidden`, because opacity hides nothing from a screen reader.

<Demo title="Every variant, size and state" :source="buttonDemoSource">
  <ButtonDemo />
</Demo>

## Disabled

The 50% dim belongs to a disabled button only. It is applied from the
`disabled` prop rather than from the DOM disabled state, because a loading
button is also DOM-disabled yet has to read as _working_, not _unavailable_.

<Demo title="Disabled">
  <Button disabled>Disabled</Button>
  <Button variant="outline" disabled>Disabled</Button>
</Demo>

## API

<!-- @api Button -->
