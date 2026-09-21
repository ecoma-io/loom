---
intent: "A shared time axis that maps durations to proportional widths — a ruler with nice-number ticks plus bars that position themselves on it, all driven by a zoomable/panable window the host owns."
---

# TimeTrack

A composition for timelines: `TimeTrack` draws a `TimeRuler` — a row of
nice-number ticks over the visible window, `tickCount` aiming for the step —
above the track, and gives every `TimeBar` inside it a position: each bar's
width is its duration as a proportion of the window, so a 2s span next to a
10s window occupies a fifth of the track.

The window is **controlled**: `viewStart`/`viewEnd` are props, not internal
state. Zoom and pan are host gestures — wheel, drag, buttons, or a scheduler
jumping to a selection — that move the two props. The pattern stays geometry,
the host owns navigation.

<script setup lang="ts">
import { TimeTrack, TimeBar } from "@ecoma-io/loom";
import TimeTrackDemo from "../demos/TimeTrackDemo.vue";
import timeTrackDemoSource from "../demos/TimeTrackDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import { TimeTrack, TimeBar } from "@ecoma-io/loom";
</script>

<template>
  <!-- The host owns the window: zoom/pan changes viewStart/viewEnd. -->
  <TimeTrack :start="0" :end="60_000" :view-start="window[0]" :view-end="window[1]">
    <TimeBar :start="0" :end="8_000" aria-label="DNS lookup" />
    <TimeBar :start="26_000" :end="42_000" aria-label="Response body" />
  </TimeTrack>
</template>
```

`TimeBar` clips itself to the visible window: a span straddling an edge renders
at its on-screen width, reaching the edge of the track rather than overflowing
it. A bar entirely outside the window — or a span whose visible width works out
to zero — renders no element at all: a zero-width bar carrying an accessible
name would be announced yet invisible, so the pattern renders absence rather
than an invisible entry in the accessibility tree.

### Zoom and pan

The window defaults to the full domain, so a static `<TimeTrack>` needs nothing
but `start`/`end`. Once a window is supplied, the demo pattern applies —
buttons, a range input, wheel handlers, or a scheduler's selection all do the
same thing: recompute the two props.

<TimeTrackDemo />

::: details Demo source

```vue
{{ timeTrackDemoSource }}
```

:::

### Ticks

The ruler picks a **nice step** — a 1, 2 or 5 times a power of ten — that
splits the window into about `tickCount - 1` intervals, so `tickCount` labels
counting both window edges, and labels stay round (`0s 2s 4s 6s 8s`) while the
window pans and zooms. The default `tickCount` is 6; pass `:tick-count="12"`
for a finer scale.

Tick labels are durations since the domain start, formatted by
`formatDuration` — adaptive (`400ms`, `1.5s`, `12m`, `2h`) — or by any
`(ms: number) => string` you pass as `format`.

### Invalid input

The geometry is total over hostile props. An unordered (`viewStart > viewEnd`)
or zero-length window divides by a 1ms floor instead of by the span: bars right
of the pan measure 0-width and render no element, the ruler renders no ticks,
and the group's label reports the clamped `0ms window`. A non-finite prop
(`NaN`, `±Infinity`) takes the same empty path — no ticks, no bars, no `NaN`
anywhere in the DOM. Nothing throws; the track renders the empty window the
props describe.

### Accessibility

The track renders `role="group"` with an `aria-label` naming the visible
window. The default label (`Time track — 12m window`) carries the window's
size; an `aria-label` you supply is used verbatim — nothing is appended to a
name you own. The ruler is announced as an image (`role="img"`) whose label
summarises the window's start and end; each bar is an image too (`role="img"`),
named by its `aria-label`, which defaults to the bar's duration in
milliseconds. A bar entirely outside the window renders no element, so the
accessibility tree never carries an invisible bar.

Bars are non-interactive geometry — nothing in the pattern takes focus or a
key: activation, selection and navigation are the host's job, on top of the
controlled window.

Times are integer epoch milliseconds. They are exact up to 2^53 (≈ 9.0 × 10^15)
— far beyond any real timestamp — so proportional widths do not drift at
1.7 × 10^12.

## Canonical record

<!-- @pattern-record TimeTrack -->
<!-- @api TimeTrack -->
