# HoverCard

A quick preview surface on hover. Unlike a Tooltip, the pointer can travel into
the card and stay a while; unlike a Popover, the card carries nothing to
operate. Its content is read-only by contract — text, an image, a definition.

<script setup lang="ts">
import { HoverCard } from "@ecoma-io/loom";
import HoverCardDemo from "../demos/HoverCardDemo.vue";
import hoverCardDemoSource from "../demos/HoverCardDemo.vue?raw";
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

<Demo title="HoverCard with basic, placement, and rich preview examples" :source="hoverCardDemoSource">
  <HoverCardDemo />
</Demo>

## Placement

The `side`, `sideOffset`, `align`, and `alignOffset` props control where the card
anchors relative to the trigger. The card flips when near a viewport boundary.

## Delays

`openDelay` and `closeDelay` control hover timing in milliseconds. The close delay
must be long enough for the pointer to travel from trigger to content without the
card vanishing mid-transit — the default of 300ms covers most pointer movements.

## Content contract

Everything inside the card must be non-interactive. The platform leaves no other
honest option: reka strips `tabindex="-1"` onto every tabbable node in the content
on mount, and the trigger closes the card on blur after `closeDelay` — so by the
time a keyboard user tabbed toward anything inside, the card would already be
gone. A link or button in the card is unreachable by keyboard (WCAG 2.1.1),
whatever the markup allows.

Keep the card to what a user reads, and duplicate anything actionable somewhere
reachable on the page itself. When a preview genuinely needs its own links or
buttons, it is not a hover card — it is a [Popover](./popover.md), whose content
takes focus and whose Esc/outside dismissal gives a keyboard user a way in and
out.

## Hover card vs. Tooltip vs. Popover

Neither hover surface carries controls. A Tooltip only supplements an accessible
name and disappears on any pointer exit; a HoverCard holds richer read-only
content and lets the pointer rest inside it. If the supplementary surface needs
to be operated — links, buttons, forms — it is a Popover.

## API

<!-- @api HoverCard -->
