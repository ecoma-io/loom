# Badge

A small status or meta chip: a non-interactive label sitting beside content
to report a category, a state, or a highlighted condition. It
never hovers, presses, or takes focus — it is not a button in disguise.

<script setup lang="ts">
import { Badge } from "@ecoma-io/loom";
import BadgeDemo from "../../src/primitives/Badge/BadgeDemo.vue";
import badgeDemoSource from "../../src/primitives/Badge/BadgeDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { Badge } from "@ecoma-io/loom";
</script>

<template>
  <Badge variant="success">rendered</Badge>
</template>
```

## Variants

`accent` is the one variant that is not about status. It wears the accent
wash — the wash and text colour Loom reserves for signalling accent-marked
items, consistent everywhere it appears. Reach for it only for items that
carry the accent, never as a decorative accent, and never hand-mix the
accent colour at the call site: every value comes from the token, so changing
the token changes every badge that uses it.

`info` is a neutral cool blue for metadata such as a selection count — it is
deliberately not the accent colour, keeping the accent reserved for `accent`.

<Demo title="Every variant" :source="badgeDemoSource">
  <BadgeDemo />
</Demo>

## Content

Content — text, a glyph like "✦", a number — passes through the default
slot. Keep it short: one or two words, or a single number.

## Difference from Button

Badge is not clickable. It has no hover lift, no press, no focus ring. A
clickable "chip" — a filter, a removable tag — is a different, interactive
block, not this primitive.

## API

<!-- @api Badge -->
