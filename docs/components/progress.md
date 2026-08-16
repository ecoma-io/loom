# Progress

A **determinate** progress bar — for a task whose completion is known as a
percentage (an upload, step 3 of 5, a batch job). `modelValue` left `null` or
omitted renders the **indeterminate** state instead, for a task that has
started but has no percentage yet.

<script setup lang="ts">
import { Progress } from "@ecoma-io/loom";
import ProgressDemo from "../demos/ProgressDemo.vue";
import progressDemoSource from "../demos/ProgressDemo.vue?raw";
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
- Want the same number as a **ring** rather than a bar — a dashboard tile, a
  quota, a score where the circle is the visual — use `RadialProgress`, which
  answers `modelValue`, `max`, clamping and the completion beat identically.

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
primary colour to `success`, eased in over the same `--duration-slow` lane as
the fill's own motion. Work that has finished reads as done at a glance.
The colour changes once and then holds with the bar — nothing loops.

## Thickness

`size` sets how heavy the track is — `sm` (4px), `md` (8px, the default) and
`lg` (12px). It is deliberately **not** the shared control-height scale a
`Select` or a `TextField` uses: a bar is a stroke laid under a heading or
inside a table row, never a control someone clicks into, so lining one up
with a 36px input would only turn it into a slab.

A bar under a page heading and a bar inside a table row are not the same
weight, and `size` is the only sanctioned way to say so — reaching past it
for an `h-*` class fights the component's own rounding and its indeterminate
segment.

<Demo title="Track thickness">
  <div class="flex w-full max-w-sm flex-col gap-4">
    <Progress :model-value="70" size="sm" aria-label="Reindexing, small track" />
    <Progress :model-value="70" size="md" aria-label="Reindexing, default track" />
    <Progress :model-value="70" size="lg" aria-label="Reindexing, large track" />
  </div>
</Demo>

## Showing the value

`show-value` prints the rounded percentage as text beside the track. It is
**off** by default, so nothing about an existing `Progress` moves: without
it the track is the whole component and stays the element your `class`
lands on. Turn it on and the track becomes one half of a flex row, the
readout the other — your `class` then describes that row, which is the box
you actually see, and every other attribute you pass (`aria-describedby`, a
`data-*` hook) still lands on the bar itself.

The readout is hidden from assistive technology. The bar already announces
the same number through `aria-valuenow`; left visible to a screen reader,
the percentage is met a second time as loose text and read out twice for
every bar on the page.

**While indeterminate the readout is an em dash, never `0%`.** "We don't
know yet" and "none of it is done" are different facts and only one of them
is true — printing a zero for the first is the component lying about the one
number it exists to report. The dash holds the row's width so the track does
not resize itself the moment a real percentage arrives.

<Demo title="The percentage as text">
  <div class="flex w-full max-w-sm flex-col gap-4">
    <Progress :model-value="62" show-value aria-label="Uploading video.mp4" />
    <Progress :model-value="100" show-value aria-label="Uploading notes.pdf" />
    <Progress show-value aria-label="Waiting on the total size" />
  </div>
</Demo>

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
- Don't reach past `size` for an `h-*` class to thicken the track.
- Don't print your own percentage beside the bar as visible text — that is
  what `show-value` is for, and a hand-rolled one is announced twice.

## Labels

The readout beside the track is the one string this component writes, and until
this label contract existed it wrote it as `${Math.round(pct)}%` — which is already wrong
for Turkish, where the sign leads the digits and the answer is `%42`.

```ts
interface ProgressLabels {
  value: (args: { value: number; max: number }) => string;
  indeterminate: string; // what prints while there is no percentage yet
}
```

Both raw numbers go over and nothing is formatted first, so three decisions
stay yours: where the per-cent sign sits, which digits are used, and whether a
percentage is the right reading of the pair at all. The rounding lives in Loom's
English default rather than in the component, so it is a wording choice you
replace along with the words. The value handed over is the _clamped_ one, so a
`modelValue` of 150 against a `max` of 100 cannot print a number the bar is not
painting.

```ts
provideLoomLabels(() => ({
  progress: {
    value: ({ value, max }) =>
      new Intl.NumberFormat("tr-TR", { style: "percent" }).format(value / max),
    indeterminate: "…",
  },
}));
```

The per-instance case is a bar counting something a percentage is simply the
wrong reading of:

```vue
<Progress
  :model-value="3"
  :max="4"
  show-value
  aria-label="Setup"
  :labels="{ value: ({ value, max }) => `Step ${value} of ${max}` }"
/>
```

`RadialProgress` carries the same two keys under its own slot rather than
sharing this one. That is deliberate: a readout beside a bar has a line to
itself, where the ring's sits inside a 40px circle, and "42% uploaded" fits the
first and overflows the second.

Annotate a bag of your own with `LabelOverrides<ProgressLabels>` rather than
with `ProgressLabels` itself: the override type is partial, so a key added in a
later release is one your bag may ignore, where the bag interface is total and
would stop compiling.

For a whole application set this once with `provideLoomLabels` rather than at
every call site. See [Localisation](/foundations/localisation).

## API

<!-- @api Progress -->
