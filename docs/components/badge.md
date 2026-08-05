# Badge

A small status or meta chip: a non-interactive label sitting beside content
to report a category, a state, or that AI produced or is producing it. It
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

`ai` is the one variant that is not about status. It wears the agent weft
— the wash and text colour Loom reserves for signalling agent-produced or
agent-running work, consistent everywhere it appears. Reach for it only for
actual agent activity, never as a decorative accent, and never hand-mix the
weft colour at the call site: every value comes from the token, so changing
the token changes every badge that uses it.

`info` is a neutral cool blue for metadata such as a selection count — it is
deliberately not a force colour, keeping the weft reserved for `ai`.

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
