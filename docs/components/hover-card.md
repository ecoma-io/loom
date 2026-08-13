# HoverCard

A quick preview surface on hover, whose content IS interactive. Unlike a Tooltip,
the user can move their pointer into the card and interact with it: click a link,
press a button, select text.

<script setup lang="ts">
import { HoverCard } from "@ecoma-io/loom";
import HoverCardDemo from "../../src/primitives/HoverCard/HoverCardDemo.vue";
import hoverCardDemoSource from "../../src/primitives/HoverCard/HoverCardDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { HoverCard } from "@ecoma-io/loom";
</script>

<template>
  <HoverCard>
    <template #trigger>
      <a href="#">@chelsea</a>
    </template>
    <div>
      <p class="font-medium">Chelsea Arryn</p>
      <p class="text-sm text-muted-foreground">Full-stack developer.</p>
    </div>
  </HoverCard>
</template>
```

<Demo title="HoverCard with basic, placement, and interactive content examples" :source="hoverCardDemoSource">
  <HoverCardDemo />
</Demo>

## Placement

The `side`, `sideOffset`, `align`, and `alignOffset` props control where the card
anchors relative to the trigger. The card flips when near a viewport boundary.

## Delays

`openDelay` and `closeDelay` control hover timing in milliseconds. The close delay
must be long enough for the pointer to travel from trigger to content without the
card vanishing mid-transit — the default of 300ms covers most pointer movements.

## Hover card vs. Tooltip

A HoverCard's content can contain interactive elements (links, buttons). A Tooltip's
cannot. If the supplementary surface needs to be clicked, it is a hover card; if it
only supplements an accessible name, it is a tooltip.

## API

<!-- @api HoverCard -->
