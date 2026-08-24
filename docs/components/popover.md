# Popover

A panel anchored to the control that opened it, for secondary content the user
opts into: a filter set, a quick form, a detail card. It is the middle of the
overlay family — richer than a tooltip, which only hints and cannot be reached,
and lighter than a dialog, which blocks the screen until it is resolved.

<script setup lang="ts">
import { Popover, Button } from "@ecoma-io/loom";
import PopoverDemo from "../demos/PopoverDemo.vue";
import popoverDemoSource from "../demos/PopoverDemo.vue?raw";
</script>

<Demo title="Popover">
  <Popover>
    <template #trigger>
      <Button variant="outline">Filters</Button>
    </template>
    <p class="text-sm">Open it, press Esc, and watch the focus come back to the button.</p>
  </Popover>
</Demo>

## Usage

```vue
<script setup lang="ts">
import { Popover, Button } from "@ecoma-io/loom";
</script>

<template>
  <Popover side="bottom" align="start">
    <template #trigger>
      <Button variant="outline">Filters</Button>
    </template>
    <p>Anything that belongs in a panel.</p>
  </Popover>
</template>
```

The trigger slot renders `as-child`: your own element _is_ the trigger, so it
keeps its own accessible name, its own variant, and its own event handlers.
Nothing is wrapped around it.

## Placement

`side` and `align` are preferences, not commands. Near a viewport edge the panel
flips to the opposite side and shifts along the cross axis, because a panel that
obeyed the request off-screen would be worse than one that moved. The panel also
grows out of its trigger rather than out of its own centre — the transform origin
follows wherever collision handling put it.

`arrow` draws the notch that points back at the trigger. Drop it where the panel
reads better flush against its anchor.

<Demo title="Sides, alignment and the notch" :source="popoverDemoSource">
  <PopoverDemo />
</Demo>

## Open state

Omit `open` and the popover owns its state. Pass `v-model:open` and your state
becomes the single source of truth — the popover then reports every open and
close request upward instead of acting on it, which is what lets a host keep a
panel open through an async save.

The distinction is the absence of the prop, not the value `false`. Passing
`false` says "stay closed", and it will.

## Escape contract

The behaviour a consumer needs to be able to predict, stated once:

- **Closes on** Esc, a click outside the panel, or the host setting `open` to
  `false`.
- **Focus on open** moves into the panel, onto its first focusable control. A
  panel with nothing focusable takes focus on the panel itself, so the keyboard
  is never left behind on the trigger with the content out of reach.
- **Focus on close** returns to the trigger, so the keyboard resumes exactly
  where it left.
- **The page behind keeps scrolling.** A popover is not modal: it blocks
  nothing, hides nothing from assistive technology, and does not trap focus —
  Tab leaves the panel. Reach for [Dialog](./dialog.md) when the task genuinely
  must be resolved before anything else.

## Choosing between the overlays

| You need                               | Use                                |
| -------------------------------------- | ---------------------------------- |
| A hint, nothing interactive            | [Tooltip](./tooltip.md)            |
| A list of commands                     | [DropdownMenu](./dropdown-menu.md) |
| Interactive content the user opts into | Popover                            |
| A task that must be resolved first     | [Dialog](./dialog.md)              |

That third row is also where an interactive *preview* belongs: a
[HoverCard](./hover-card.md)'s content must stay non-interactive, because a
keyboard user can never reach inside one. When a preview needs its own links or
buttons, open it as a popover instead.

## API

<!-- @api Popover -->
