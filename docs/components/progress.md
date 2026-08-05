# Progress

A **determinate** progress bar — for a task whose completion is known as a
percentage (an upload, step 3 of 5, a batch job). `modelValue` left `null` or
omitted renders the **indeterminate** state instead, for a task that has
started but has no percentage yet.

<script setup lang="ts">
import { Progress } from "@ecoma-io/loom";
import ProgressDemo from "../../src/primitives/Progress/ProgressDemo.vue";
import progressDemoSource from "../../src/primitives/Progress/ProgressDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { Progress } from "@ecoma-io/loom";
</script>

<template>
  <Progress :model-value="40" aria-label="Uploading video.mp4" />
</template>
```

## When to reach for it, and when not to

- Know the **percentage** of a running task (upload, multi-step progress, a
  batch job) — use `Progress` with `modelValue` set to a number in `[0, max]`.
- Know neither the **duration nor the percentage** (an API call with no
  predictable size) — use `Spinner` instead of guessing a `modelValue`.
- Know the **layout shape** about to appear but have no data yet — use
  `Skeleton`.

<Demo title="Determinate and indeterminate" :source="progressDemoSource">
  <ProgressDemo />
</Demo>

## Determinate vs indeterminate

- **Determinate** (`modelValue` is a number): the fill is `primary`,
  positioned by `transform: translateX(...)` inside an `overflow-hidden`
  track, at exactly `modelValue / max`.
- **Indeterminate** (`modelValue` is `null`/omitted): a short segment sweeps
  the track on a loop (`animate-progress-indeterminate`, `--ease-in-out`) —
  motion that says "running" without inventing a percentage to paint. Reach
  for this when a task has started but its percentage isn't known yet, for
  instance while waiting on a server to report a total size before an upload
  percentage can be computed.

## The completion beat

Crossing `100%` is a moment, not a silent state: the fill turns from the
warp colour to `success`, eased in over the same `--duration-slow` lane as
the fill's own motion. Work that has finished reads as done at a glance.
The colour changes once and then holds with the bar — nothing loops.

## Clamping

`modelValue` is clamped into `[0, max]` before the percentage is computed —
a negative or over-`max` value can never push the fill past the track.

## Accessible name

`Progress` is a **bare** primitive — the root carries `role="progressbar"`
plus `aria-valuenow`/`aria-valuemin`/`aria-valuemax` automatically, and
`aria-valuenow` is present only while determinate; while indeterminate it is
left off entirely rather than reported as `0`, since there is nothing yet to
announce. Pass `aria-label` or `aria-labelledby` to describe the **task**
that's running (e.g. "Uploading video.mp4"), overriding Reka UI's default
percentage-only label.

## Do / Don't

- Do pass `aria-label`/`aria-labelledby` describing the task, not just rely
  on the default percentage label.
- Do use `Progress` when a real percentage exists; if all you have is "this
  is happening", reach for `Spinner`.
- Don't invent a `modelValue` to dodge the indeterminate state — leave it
  `null`/omitted.
- Don't use `Progress` for a content block that hasn't loaded yet — that's
  `Skeleton`.

## API

<!-- @api Progress -->
