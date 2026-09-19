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
it. Bars outside the window render nothing visible — the track clips them.

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
splits the window into about `tickCount` intervals, so labels stay round
(`0s 2s 4s 6s 8s`) while the window pans and zooms. The default
`tickCount` is 6; pass `:tick-count="12"` for a finer scale.

Tick labels are durations since the domain start, formatted by
`formatDuration` — adaptive (`400ms`, `1.5s`, `12m`, `2h`) — or by any
`(ms: number) => string` you pass as `format`.

### Accessibility

The track renders `role="group"` with an `aria-label` naming the visible
window (`Time track — 12m window` by default; `aria-label` overrides it). The
ruler is decorative — the ticks' meaning lives in the window label and in each
bar's own `aria-label`, which defaults to the bar's duration in milliseconds.

Bars are non-interactive geometry: activation, selection and navigation are the
host's job, on top of the controlled window.

## Canonical record

<!-- @pattern-record TimeTrack -->
<!-- @api TimeTrack -->
