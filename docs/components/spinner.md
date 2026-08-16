# Spinner

An indeterminate loading indicator: reach for it when there is no way to
predict how long the wait will be and no known layout for what's coming.

<script setup lang="ts">
import { Spinner } from "@ecoma-io/loom";
import SpinnerDemo from "../demos/SpinnerDemo.vue";
import spinnerDemoSource from "../demos/SpinnerDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { Spinner } from "@ecoma-io/loom";
</script>

<template>
  <Spinner label="Saving changes" />
</template>
```

## When to reach for it

Use Spinner while waiting on something whose duration can't be predicted —
an API call, a form submission, background work — and where the shape of
what replaces it isn't known yet. Once the layout **is** known (a list, a
card, an avatar), use `Skeleton` instead, so the viewer sees the shape of
what's coming rather than a generic wait. For a static layout division with
no loading involved at all, that's `Separator`, not this.

## Accessibility

The root carries `role="status"` and `aria-label` (from the `label` prop,
defaulting to "Loading") — a screen reader announces the wait through that
label. The SVG arc inside is purely decorative (`aria-hidden`), because the
meaning already lives entirely in the label. Always pass a `label` that
names the specific thing being waited on (e.g. "Saving changes") rather than
leaving the generic default when the surrounding context doesn't make it
obvious on its own.

`Button`'s own loading state deliberately does not render this component —
it inlines the same arc directly. `role="status"` on a control that is
already `aria-busy` would announce the wait twice: once from the button's
own busy state, once from a nested Spinner. Reach for Spinner standalone;
inside a component that already carries `aria-busy`, inline the arc instead.

## Sizes

<Demo title="Sizes">
  <Spinner size="sm" label="Loading item" />
  <Spinner size="md" label="Loading" />
  <Spinner size="lg" label="Loading page" />
</Demo>

## Colour

Spinner uses `text-current` / `stroke-current` / `fill-current` — it
**inherits** the text colour of its parent rather than painting its own. Set
`text-{color}` (or a colour token) on the surrounding element to change the
spinner's colour; never edit it inside the component.

## Motion

The arc spins by Tailwind's built-in `animate-spin`. Under
`prefers-reduced-motion` the global reduced-motion rule caps the animation
to a single, effectively instantaneous frame, so the spinner reads as a
static ring rather than a continuous spin — the `label` still carries the
loading meaning either way.

<Demo title="Inline beside text" :source="spinnerDemoSource">
  <SpinnerDemo />
</Demo>

## API

<!-- @api Spinner -->
