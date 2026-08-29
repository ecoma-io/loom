# Alert

Persistent inline contextual feedback — a message that stays where it is
until the reader or the host removes it. It is not Toast: a toast floats
above the page and leaves on its own; an alert sits in the flow where the
condition it reports lives, and it never disappears by itself.

An alert's interruption matches its stakes: `warning` and `destructive`
tones announce as `role="alert"` (assertive), while `neutral`, `info` and
`success` announce as the polite `role="status"` — a "Saved" note should
not cut off what is being read. The `live` prop overrides the per-tone
default for surfaces where the automatic choice does not fit; `live="off"`
removes the live semantics for static walls of notices that should not
interrupt at all.

<script setup lang="ts">
import { Alert } from "@ecoma-io/loom";
import AlertDemo from "../demos/AlertDemo.vue";
import alertDemoSource from "../demos/AlertDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { Alert } from "@ecoma-io/loom";
</script>

<template>
  <Alert variant="warning" title="Approaching quota">
    90% of this month's render minutes are used.
  </Alert>
</template>
```

## Variants

The five tones match Toast and Badge, and paint the same measured washes —
`bg-*-muted` grounds with `*-text` labels, the pairs theme.css mixes to hold
their contrast in light and dark. `neutral` is the default: an alert's first
job is to be seen at all, not to alarm. Each tone carries a default icon,
marked decorative so the words remain the only announcement; replace it
through the `icon` slot when a message needs its own.

<Demo title="Tones, dismissal and long content" :source="alertDemoSource">
  <AlertDemo />
</Demo>

## Dismissal

`dismissible` adds a close control named through the labels seam (an unnamed
close button tells a screen-reader user nothing about which note they are
removing). The component owns its visibility until dismissed unless you bind
`v-model:open`, in which case it reports the dismissal and lets the host
decide — the same controlled/uncontrolled split Dialog uses. Leaving plays a
short fade-fall; under `prefers-reduced-motion` both phases collapse to an
instant swap.

## Difference from neighbours

- **Toast** reports after the fact, above the page, on its own clock.
- **InlineError** belongs to one field's validation state, inside Field.
- **ErrorState** replaces a whole region that failed, not a condition beside
  working content.

## API

<!-- @api Alert -->
