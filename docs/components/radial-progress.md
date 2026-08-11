# RadialProgress

The same information `Progress` carries, drawn as a ring: a dashboard tile, a
storage quota, a score out of 100 where the circle **is** the visual. Its
contract is `Progress`'s to the letter — `modelValue` left `null` or omitted
renders the **indeterminate** state, the value is clamped into `[0, max]`, and
the arc turns `success` at 100%.

Reach for `Progress` instead wherever the bar sits in a row of text and its
length is what does the comparing — a list of uploads reads far better as a
column of bars than as a row of rings. Reach for `Spinner` when there is no
percentage at all: a ring with nothing to fill is a spinner wearing a gauge's
clothes.

<script setup lang="ts">
import { RadialProgress } from "@ecoma-io/loom";
import RadialProgressDemo from "../../src/primitives/RadialProgress/RadialProgressDemo.vue";
import radialProgressDemoSource from "../../src/primitives/RadialProgress/RadialProgressDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { RadialProgress } from "@ecoma-io/loom";
</script>

<template>
  <RadialProgress :model-value="62" size="lg" aria-label="Storage used" />
</template>
```

## When to reach for it, and when not to

- The number **is** the tile — a quota, a health score, a completion ring on
  a card. Use `RadialProgress`.
- The bar sits in a row, a table cell or a list, and its length is being read
  against its neighbours' — use `Progress`.
- There is no percentage, only a wait — use `Spinner`.
- The layout that's coming is known but its data is not — use `Skeleton`.

<Demo title="Sizes, thickness, the ends of the range, indeterminate" :source="radialProgressDemoSource">
  <RadialProgressDemo />
</Demo>

## Size and thickness

`size` sets the outer diameter — `sm` (40px) for a table row or list marker,
`md` (64px) for a card corner, `lg` (96px) for the tile where the ring is the
whole visual. Like `Progress`'s own `size` this is its own scale rather than
the shared control-height scale, because a ring never has to line up beside a
text input.

`thickness` — `thin`, `regular`, `thick` — is measured in the drawing's own
units rather than in pixels, so the ratio of stroke to diameter holds at every
size: a `thick` ring reads as thick whether it is 40px or 96px across.

The stroke is centred on the path it follows, so half of it falls **outside**
the circle's radius. The radius is inset by half the stroke width for exactly
that reason; without the inset a thick ring paints past the edge of its own
box and the browser clips it, which is the flat top that makes a radial
progress look broken.

<Demo title="Diameter and stroke">
  <RadialProgress :model-value="62" size="sm" aria-label="Storage used, small" />
  <RadialProgress :model-value="62" size="md" aria-label="Storage used, medium" />
  <RadialProgress :model-value="62" size="lg" aria-label="Storage used, large" />
  <RadialProgress :model-value="62" size="lg" thickness="thin" aria-label="Storage used, thin ring" />
  <RadialProgress :model-value="62" size="lg" thickness="thick" aria-label="Storage used, thick ring" />
</Demo>

## The centre readout

`show-value` is **on** by default here, where `Progress` has it off. A bar has
a length a reader can compare against its own track; a ring does not — 70% and
80% are very nearly the same arc to the eye — so the number is what makes the
ring readable at all. It is set in the drawing's own units, which is what keeps
it inside the ring at `sm` rather than spilling over the stroke.

Turn it off for the tile that prints its own number in the surrounding type, at
a size the ring could never hold.

Like `Progress`'s readout it is hidden from assistive technology, since the ring
already announces the same number through `aria-valuenow`, and **while
indeterminate it prints an em dash rather than `0%`** — "we don't know yet" and
"none of it is done" are different facts.

<Demo title="Readout on and off">
  <RadialProgress :model-value="86" size="lg" aria-label="Delivery score" />
  <RadialProgress :model-value="86" size="lg" :show-value="false" aria-label="Delivery score, no readout" />
</Demo>

## Determinate and indeterminate

- **Determinate** (`modelValue` is a number): one dash as long as the whole
  path, pushed back by the fraction still to do. It starts at twelve o'clock
  and fills clockwise.
- **Indeterminate** (`modelValue` is `null`/omitted): a fixed quarter-turn
  segment spinning on a loop, and a dash where the number would be. Motion that
  says "running" without inventing a percentage to paint.

At exactly `0` the arc's cap squares off. A rounded cap on a zero-length arc
still paints a dot at twelve o'clock, which reads as a couple of percent done
rather than as nothing at all.

<Demo title="Both ends of the range, and no range at all">
  <RadialProgress :model-value="0" aria-label="Onboarding, not started" />
  <RadialProgress :model-value="8" aria-label="Onboarding, just started" />
  <RadialProgress :model-value="100" aria-label="Onboarding, complete" />
  <RadialProgress aria-label="Syncing workspace" />
</Demo>

## The completion beat

Crossing `100%` is a moment, not a silent state: the arc turns from the warp
colour to `success`, eased in over the same `--duration-slow` lane as the fill
itself. It is the same beat `Progress` plays, and the colour is never the only
carrier — the readout says `100%` and `aria-valuenow` reports it.

## Screen readers

`RadialProgress` is built on the same Reka UI root as `Progress`, so the ring
carries `role="progressbar"` with `aria-valuenow`/`aria-valuemin`/
`aria-valuemax`, and `aria-valuenow` is present only while determinate. The SVG
underneath is `aria-hidden` in one piece: everything it draws is already
announced by that role.

Pass `aria-label` or `aria-labelledby` to name the **task or quantity** the ring
is reporting ("Storage used"), overriding Reka UI's default percentage-only
label. There is no keyboard interaction — nothing here is operable, and the ring
takes no Tab stop.

## Motion

Two lanes, both CSS:

- The arc's fill and its colour move on `--duration-slow` with `--ease-out`,
  the same lane `Progress` uses — a value settling is a deliberately unhurried
  transition, not a response to a press.
- The indeterminate spin is a looping CSS animation on the ring as a whole.

Both collapse under `prefers-reduced-motion` through the global rule in
`global.css`. That is why the spin is a CSS animation rather than a JavaScript
ticker: a `requestAnimationFrame` loop would keep turning for a reader who
asked the whole system for less motion, and would keep turning after the
component went away.

## Do / Don't

- Do pass `aria-label`/`aria-labelledby` naming what the ring measures.
- Do turn `show-value` off when the surrounding tile already prints the number.
- Don't line up several rings to compare their values — a column of `Progress`
  bars is read far more accurately.
- Don't invent a `modelValue` to dodge the indeterminate state — leave it
  `null`/omitted.

## API

<!-- @api RadialProgress -->
