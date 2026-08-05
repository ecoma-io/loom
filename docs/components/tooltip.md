# Tooltip

A short, non-interactive hint on hover or keyboard focus of its trigger: the
label for an icon-only button, or one terse explanation of a control.

<script setup lang="ts">
import { Tooltip, Button } from "@ecoma-io/loom";
import TooltipDemo from "../../src/primitives/Tooltip/TooltipDemo.vue";
import tooltipDemoSource from "../../src/primitives/Tooltip/TooltipDemo.vue?raw";
</script>

<Demo title="Tooltip">
  <Tooltip content="Split the clip at the playhead">
    <template #trigger>
      <Button variant="subtle" size="icon" aria-label="Split clip">S</Button>
    </template>
  </Tooltip>
</Demo>

## A tooltip is not a small popover

This is the mistake worth naming first, because the two look alike and behave
nothing alike.

**Focus never enters a tooltip.** Focus stays on the trigger for the entire time
the tip is shown — that is what lets a keyboard user read it and keep going. It
also means nothing inside a tip can be reached: not a link, not a button, not
text a user can select. The moment a hint needs any of those it is a
[Popover](./popover.md), and reaching for `Tooltip` there produces content no
keyboard and no touch user can get to.

**It describes, it does not name.** The tip is wired as `aria-describedby`,
never `aria-labelledby`. It supplements an accessible name and must never be the
only source of one. An icon-only button therefore still carries its own
`aria-label` — a screen reader user who never hovers would otherwise meet an
unnamed button:

```vue
<Tooltip content="Split the clip at the playhead">
  <template #trigger>
    <Button size="icon" aria-label="Split clip"><Scissors /></Button>
  </template>
</Tooltip>
```

## Usage

```vue
<script setup lang="ts">
import { Tooltip, Button } from "@ecoma-io/loom";
</script>

<template>
  <Tooltip content="Split the clip at the playhead (S)" side="top">
    <template #trigger>
      <Button variant="subtle" size="icon" aria-label="Split clip">✂</Button>
    </template>
  </Tooltip>
</template>
```

`content` is the plain-text hint. The default slot takes precedence where the
hint needs markup — keeping in mind that nothing in it can be interacted with.

The trigger renders `as-child`, so your own element _is_ the trigger and keeps
its accessible name. It also means the trigger must be focusable: a hint hung on
a plain `<span>` is reachable by pointer alone, which is not a contract Loom
considers complete.

## Delay and placement

`delay` is the hover dwell before the tip appears; it defaults to a length that
keeps a tip from flashing as the pointer crosses a toolbar. **Keyboard focus is
always immediate** — a keyboard user asked for the hint deliberately and has
nothing to wait through. The reveal animation follows the same split: it belongs
to the hover path, and the focus path just appears.

`side` and `sideOffset` place it, and `side` is a preference: near a viewport
edge the tip flips to the opposite side rather than obeying off-screen.

<Demo title="Sides, delay and a hint with markup" :source="tooltipDemoSource">
  <TooltipDemo />
</Demo>

## Escape contract

- **Closes on** Esc, the pointer leaving the trigger, the trigger losing focus,
  or the host setting `open` to `false`.
- **Focus on open**: nothing moves. Focus stays on the trigger — the tip never
  takes it.
- **Focus on close**: nothing moves, for the same reason.
- **The page behind keeps scrolling.** A tooltip is not modal, blocks nothing,
  and hides nothing from assistive technology.

`v-model:open` exists for the case where a hint is shown deliberately — an
onboarding pass, say — rather than by hover. It does not change any of the
above.

## Provider

The provider is bundled in, so a single tooltip works with no setup. An
application with many can hoist one provider higher later; that is what shares
the hover delay between them, so moving along a toolbar does not re-serve the
delay at every button.

## API

<!-- @api Tooltip -->
