# Indicator

The small marker pinned onto the corner of something else: a presence dot on an
avatar, an unread count on a bell, a "needs attention" dot on a tab. The default
slot is the thing being marked, and the marker positions itself over that
child's corner.

The line between this and [Badge](./badge) is worth stating plainly, because it
is the only thing that decides between them. **Badge sits in the flow beside
content; Indicator is pinned onto content.** A count chip in a table cell, next
to a row's name, is a Badge — it takes up room, and the row's layout accounts
for it. The same count floating over a bell icon is an Indicator: it overhangs,
it takes no room, and the icon underneath does not move to make space.

The colours are Badge's colours, by the same names, so nothing has to be learned
twice — `success`, `warning`, `info`, `destructive`, and `ai` for the agent
weft, meaning here exactly what it means there: work an agent produced or is
running, never decoration. The values are the solid tokens rather than Badge's
12% washes, because a wash that reads as a colour across a chip reads as nothing
at all across twelve pixels.

<script setup lang="ts">
import { Indicator, Avatar } from "@ecoma-io/loom";
import IndicatorDemo from "../../src/primitives/Indicator/IndicatorDemo.vue";
import indicatorDemoSource from "../../src/primitives/Indicator/IndicatorDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { Avatar, Indicator } from "@ecoma-io/loom";
</script>

<template>
  <Indicator status="online" placement="bottom-right">
    <Avatar fallback="HM" />
  </Indicator>
</template>
```

## Every state

<Demo title="Every state" :source="indicatorDemoSource">
  <IndicatorDemo />
</Demo>

## Presence

`status` is what a dot reports — `online`, `offline`, `busy`, `away` — and it
settles three things at once: the colour, the shape, and what a screen reader is
told. A dot with no `status` is the generic "something here changed" marker, and
it takes the `primary` colour and the name "Needs attention" unless you give it
a better one.

Three of the four states are saturated: green, amber, red. That is the exact
triple a red/green deficiency collapses into one another, so colour alone is not
allowed to be the difference. `busy` carries a bar and `away` a punched-out
hole; `online` is plain, and `offline` needs no shape because grey differs from
all three by saturation rather than by hue.

<Demo title="Presence">
  <div class="flex items-center gap-5">
    <Indicator status="online" placement="bottom-right"><Avatar fallback="HM" /></Indicator>
    <Indicator status="away" placement="bottom-right"><Avatar fallback="LT" /></Indicator>
    <Indicator status="busy" placement="bottom-right"><Avatar fallback="DP" /></Indicator>
    <Indicator status="offline" placement="bottom-right"><Avatar fallback="NV" /></Indicator>
  </div>
</Demo>

## Counts

`variant="count"` prints a number. One digit comes out as a circle and more as a
pill, from a minimum width rather than a branch, so a count of 1 and a count of
132 both look deliberate rather than one looking like a mistake.

`max` is where the printed figure stops — 99 by default, so 132 prints as `99+`.
The clamp is a decision about how wide the pill may get, and it applies to the
pill only: the hidden text a screen reader reads still says "132 unread",
because a reader who cannot see the pill has no reason to inherit its width
problem.

`showZero` is off by default. A count of nothing is not news, so the marker is
not rendered at all — not hidden, not dimmed, absent, along with its text. Turn
it on for the rare surface where "0" is itself the reassurance. A negative count
is treated the same way as zero: it is a bug in the data, and painting `-1` over
a bell reports that bug to the reader rather than to you.

<Demo title="Counts">
  <div class="flex items-center gap-6">
    <Indicator variant="count" :count="1"><span class="block h-9 w-9 rounded-md bg-muted" aria-hidden="true" /></Indicator>
    <Indicator variant="count" :count="12"><span class="block h-9 w-9 rounded-md bg-muted" aria-hidden="true" /></Indicator>
    <Indicator variant="count" :count="132"><span class="block h-9 w-9 rounded-md bg-muted" aria-hidden="true" /></Indicator>
    <Indicator variant="count" :count="0" show-zero label="Inbox clear"><span class="block h-9 w-9 rounded-md bg-muted" aria-hidden="true" /></Indicator>
  </div>
</Demo>

## Placement and the ring

`placement` picks which of the four corners the marker straddles, defaulting to
`top-right`. A presence dot usually wants `bottom-right`, which is where a
reader's eye has learned to find it on a portrait.

The marker is separated from whatever is underneath it by a ring in the colour
of the surface _around_ the pair — the same trick that makes a presence dot read
as punched out of a photo rather than dropped on top of it. Only the caller
knows which surface that is, so `surface` names it: `background` (the default),
`card`, `sunken` or `popover`. An indicator on a card with the default ring
shows a faint halo of the page colour, which is the tell that the prop was
missed.

<Demo title="Placement and the ring">
  <div class="flex items-center gap-6">
    <Indicator placement="top-left" label="Draft has unsaved edits"><span class="block h-9 w-9 rounded-md bg-muted" aria-hidden="true" /></Indicator>
    <Indicator placement="top-right" label="Draft has unsaved edits"><span class="block h-9 w-9 rounded-md bg-muted" aria-hidden="true" /></Indicator>
    <Indicator placement="bottom-left" label="Draft has unsaved edits"><span class="block h-9 w-9 rounded-md bg-muted" aria-hidden="true" /></Indicator>
    <Indicator placement="bottom-right" label="Draft has unsaved edits"><span class="block h-9 w-9 rounded-md bg-muted" aria-hidden="true" /></Indicator>
    <div class="flex items-center gap-6 rounded-md border border-border bg-card p-4">
      <Indicator status="online" surface="card" placement="bottom-right"><Avatar fallback="HM" size="sm" /></Indicator>
      <Indicator variant="count" :count="9" surface="card"><span class="block h-8 w-8 rounded-md bg-muted" aria-hidden="true" /></Indicator>
    </div>
  </div>
</Demo>

## Keyboard and screen readers

Indicator takes no focus and answers no key. It is a marker, not a control, and
the thing it is pinned to keeps whatever behaviour it already had — the marker
is `pointer-events-none`, so the corner of a button it overhangs stays
clickable.

Every marker that renders carries visually hidden text, and there is no way to
render one without it. `label` is that text; leave it unset and it is derived —
"Online" from a status, "3 unread" from a count, "Needs attention" from a bare
dot. A `label` that is blank or only whitespace falls back to the derived string
rather than clearing it, which is what makes an unnamed indicator unreachable
instead of merely discouraged. Set `label` yourself whenever the derived text
would be wrong: the count default assumes unread things, and "7 agent runs
finished" is not that.

When the marked child is **interactive**, one more step is needed and the
component hands you the tools for it. A button computes its accessible name from
its own contents, and the marker's text sits outside the button, so a bell
announces "Notifications, button" on focus and never mentions the three unread.
The default slot exposes `labelId` for exactly this — bind it to the control's
`aria-describedby` and the count is announced straight after the name, once,
without being duplicated into the label:

```vue
<Indicator v-slot="{ labelId }" variant="count" :count="unread">
  <Button variant="ghost" size="icon" aria-label="Notifications" :aria-describedby="labelId">
    <Bell />
  </Button>
</Indicator>
```

### Why there is no live region here

A changing count should be announced, but this component is the wrong place to
decide that, so it carries no `aria-live` region and no `role="status"`.

An unread counter is usually fed by a poll, and a live region around one
announces every tick over whatever the reader was doing — a bell that interrupts
on a schedule is worse than one that stays quiet. The same count is commonly
pinned in two places at once, a bell and a sidebar row, which announces it
twice. And a polite region speaks on first render in several screen reader and
browser pairs, turning every page load into a recitation of the inbox.

So the marker is static text a reader reaches on demand, and announcing a
_change_ stays with you, who knows whether it followed something the reader just
did. Put an `aria-live="polite"` region where that is true — after a send, after
a refresh the reader asked for — and leave the poll silent.

## Motion

A count arrives on `animate-scale-in`: the fast lane with the restrained spring,
because a number appearing is news and a small settle earns its place. It replays
only when the _printed_ figure changes, so a poll moving 100 to 132 behind the
same `99+` animates nothing.

A dot never animates and never pulses. Presence settles in with the page rather
than arriving as news, and a looping marker would be decoration — which nothing
in Loom is. `animate-conduct` is not an option here either: it is the weft's
shuttle beat, reserved for agent work specifically, and not a general-purpose
way to draw an eye.

Both paths are CSS animations, so the global `prefers-reduced-motion` rule
collapses them without anything in this component having to answer for itself.

## API

<!-- @api Indicator -->
