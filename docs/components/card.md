# Card

A compositional surface with named sections. The box itself is Surface's own
card styling, consumed as data rather than restyled — radius, hairline and
ground cannot drift between a Card and a bare Surface. What Card adds is the
rhythm those sections share and the two ways a card becomes interactive.

<script setup lang="ts">
import { Card } from "@ecoma-io/loom";
import CardDemo from "../demos/CardDemo.vue";
import cardDemoSource from "../demos/CardDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { Card } from "@ecoma-io/loom";
</script>

<template>
  <Card title="Usage" description="Render minutes this month">
    <p>6,420 of 10,000 included</p>
    <template #footer>
      <Button variant="subtle" size="sm">Manage plan</Button>
    </template>
  </Card>
</template>
```

## Sections

`media` renders edge-to-edge above everything, clipped to the card's corners;
the header carries `title`/`description` (or a wholesale `header` slot for
custom layouts); the default slot is the substance; `footer` recesses under a
hairline as chrome for what sits above it.

<Demo title="Compositions" :source="cardDemoSource">
  <CardDemo />
</Demo>

## Making a card interactive

Two shapes, because a third would be a lie:

- **`href`** — the whole card is one link. One Tab stop, real anchor
  semantics, the content itself for an accessible name, press and focus-ring
  languages included. Nothing interactive may be placed inside: nested
  controls inside an anchor are unreadable to assistive technology. When the
  card must offer actions _and_ navigation, make the title a Link instead and
  keep the card still.
- **`interactive`** — hover and press language only, for clickables whose
  behaviour belongs to the host. As with Surface, attach the role, tabindex
  and handler yourself; the component paints intent without inventing
  semantics.

A resting card paints neither language — hover is a promise about behaviour.

## Difference from Surface

Surface answers "what does this box look like?" and hands you an empty one;
its interactive variant documents that the host owns every part of the
behaviour. Card answers "how does composed content sit inside that box?" —
sections, typography contract, and a whole-card link done with correct
semantics. Reach for Surface when only the box matters.

## API

<!-- @api Card -->
