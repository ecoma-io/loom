# Timeline

A chronological spine: markers down a line, each carrying a moment — title,
description, timestamp — and where it sits relative to now. Vertical is the
only axis on purpose: a horizontal timeline is a Stepper wearing different
clothes.

<script setup lang="ts">
import { Timeline } from "@ecoma-io/loom";
import TimelineDemo from "../demos/TimelineDemo.vue";
import timelineDemoSource from "../demos/TimelineDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { Timeline, TimelineItem } from "@ecoma-io/loom";
</script>

<template>
  <Timeline>
    <TimelineItem title="Order placed" status="complete" timestamp="09:00" />
    <TimelineItem title="In production" status="current" />
    <TimelineItem title="Shipped" status="upcoming" description="Carrier pickup at 17:00." />
  </Timeline>
</template>
```

## Statuses

`complete`, `current`, `upcoming` — explicit, because the host owns the truth
about what has happened. The marker changes with the state (filled check,
haloed primary, hollow) **and** every item announces its status in words
beside the title: a dot's colour alone is not a state. The current moment
also carries `aria-current="step"`.

The connector is drawn per item and retired on the last, so the line stops
where the story does. Emphasis on the current marker is a static halo — no
pulse — so reduced-motion readers lose nothing.

<Demo title="A delivery, mid-flight" :source="timelineDemoSource">
  <TimelineDemo />
</Demo>

## Difference from Stepper

Ordered stages a reader moves _through_, with reachability rules and
keyboard traversal → `Stepper`. A record of moments a reader _scans_ → this.
If a design reaches for a horizontal timeline, it is asking for Stepper.

## API

<!-- @api Timeline -->

### TimelineItem

<!-- @api TimelineItem -->
