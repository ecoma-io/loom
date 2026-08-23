# Kbd

One keyboard key cap — a letter, a glyph, an arrow character — set in the
mono face inside a subtle, bottom-weighted well so it reads as something
you could press.

<script setup lang="ts">
import { Kbd } from "@ecoma-io/loom";
import KbdDemo from "../demos/KbdDemo.vue";
import kbdDemoSource from "../demos/KbdDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { Kbd } from "@ecoma-io/loom";
</script>

<template>Press <Kbd size="sm">Enter</Kbd> to send.</template>
```

## Combinations

A combination is several caps joined by a visible separator the host
renders, with the whole run named once (`role="img"` + `aria-label`, or a
plain `aria-label` on a wrapper). Kbd deliberately does not parse shortcut
strings — the line between display and a shortcut manager is exactly where
this primitive stops.

<Demo title="Keys, combinations and prose" :source="kbdDemoSource">
  <KbdDemo />
</Demo>

## Sizes

`sm` sits inside prose and table cells; `md` for settings pages. Both keep
the cap at or above a 24px box so inline baselines never shift.

## API

<!-- @api Kbd -->
