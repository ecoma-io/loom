# Button

The workhorse, and the primitive that carries Loom's press language: hover
lifts by fill rather than by shadow, a press scales down so the feedback is
physical, focus blooms the ring, and a busy button plays a kinetic swap instead
of freezing under a spinner.

<script setup lang="ts">
import { Button } from "@ecoma-io/loom";
import ButtonDemo from "../demos/ButtonDemo.vue";
import buttonDemoSource from "../demos/ButtonDemo.vue?raw";
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

A disabled button **drains** rather than dims, and it drains on three channels
at once: the fill falls to the neutral well, the label to
`--color-muted-foreground` — 4.67:1 over it — and the border slackens from
`--color-input` to the lighter `--color-border`. A state told in hue alone is a
state a reader with a colour deficiency does not receive, so the fill and the
weight say it as well.

There is no `opacity` in any of that, and the reason is that a button is nothing
but a label on a fill: half alpha took a disabled `primary` label to 1.62:1
against its own faded fill and a disabled `outline` to 3.14:1 on the page
ground, and no amount of recolouring the label reaches either number, because
the fade multiplies whatever colour it is given.

One neutral treatment covers all six variants rather than six drained pairs. The
fill is what carries a variant's emphasis, and an unavailable button has no
emphasis to carry — the two filled variants give up their hue and the three
transparent ones gain a fill, so every one of them changes visibly on the way
in. It is the same well [Chip](./chip) and [Stepper](./stepper) drain to, so an
unavailable control looks the same wherever it appears.

It is applied from the `disabled` prop rather than from the DOM disabled state,
because a loading button is also DOM-disabled yet has to read as _working_, not
_unavailable_.

<Demo title="Available against disabled">
  <Button>Available</Button>
  <Button disabled>Disabled</Button>
  <Button variant="outline">Available</Button>
  <Button variant="outline" disabled>Disabled</Button>
</Demo>

A button has no read-only state, and nothing here approximates one. Read-only is
a value a reader may see but not change, and a button holds no value — a button
nobody may press is a disabled button, and the lifted fill that marks a value on
show never appears on it. Buttons rest in two appearances, not the three a
[TextField](./text-field) has.

## API

<!-- @api Button -->
