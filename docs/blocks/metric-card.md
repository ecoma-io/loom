# MetricCard

A single KPI stat card — a compact surface showing one metric, its label,
and an optional trend indicator. This is the building block for dashboard
metric rows. The fixed layout (icon, label, value + inline trend) pins one
shape so a row of metrics scans left-to-right rather than drifting from call
site to call site.

<script setup lang="ts">
import { MetricCard } from "@ecoma-io/loom";
import MetricCardDemo from "../../src/blocks/MetricCard/MetricCardDemo.vue";
import metricCardDemoSource from "../../src/blocks/MetricCard/MetricCardDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { MetricCard } from "@ecoma-io/loom";
import { Users } from "@lucide/vue";
</script>

<template>
  <MetricCard value="12,847" label="Active users" trend="up" trend-value="+12.5%">
    <template #icon><Users /></template>
  </MetricCard>
</template>
```

<Demo title="Four metric cards: users, revenue, churn, uptime" :source="metricCardDemoSource">
  <MetricCardDemo />
</Demo>

## The trend is inline, never a second line

A trend on its own row reads as a second metric. Sharing the value line
reads as context for that metric, which is what it is. The arrows are inline
SVGs (12px) rather than an icon-library dependency — a trend indicator is a
single directional glyph, and pulling in an icon package for three paths is
weight the host did not ask for.

## Colour encodes direction but is not the only signal

The arrow shape distinguishes up from down even without hue, and "flat" is
an em dash rather than a horizontal arrow that could be mistaken for a minus
sign or a separator. `text-success` / `text-destructive` / `text-muted-foreground`
are the semantic tokens rather than fixed greens and reds, so the card adapts
to whatever the theme maps those to.

## The host owns formatting

The `value` prop is a string or number the host has already formatted
("1,234", "98.5%", "$42k"). Raw numbers are not formatted by the card so
the same value can be "$42k" in one place and "42,000" in another. The
`trendValue` follows the same rule.

## API

<!-- @api MetricCard -->
