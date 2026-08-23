<script lang="ts">
/**
 * MetricCard — one KPI on a dashboard: a compact surface carrying a metric
 * value, its label, and an optional trend arrow. The shape is fixed (icon →
 * label → value + trend) because a hand-rolled metric row drifts from call
 * site to call site — the icon above the label here, the trend on a second
 * line there — and this block pins one layout so the row scans left-to-right.
 *
 * The trend is always inline with the value, never a separate line. A trend
 * on its own row reads as a second metric; sharing the value line reads as
 * context for that metric, which is what it is. The arrows are inline SVGs
 * (12px) rather than an icon-library dependency: a trend indicator is a
 * single directional glyph, and pulling in an icon package for three paths
 * is weight the host did not ask for.
 *
 * Colour encodes direction but is never the only signal: the arrow shape
 * distinguishes up from down even without hue, and "flat" is an em dash
 * rather than a horizontal arrow that could be mistaken for a minus sign or
 * a separator. `text-success-text` / `text-destructive-text` / `text-muted-foreground`
 * are the semantic tokens rather than fixed greens and reds, so the card
 * adapts to whatever the theme maps those to.
 */
export type MetricCardTrend = "up" | "down" | "flat";
</script>

<script setup lang="ts">
import { watchEffect } from "vue";
import Skeleton from "@ecoma-io/loom-skeleton";
import { cn } from "@ecoma-io/loom-core";

const props = defineProps<{
  /** The metric value — a formatted string or number the host has already
   *  localised (e.g. "1,234", "98.5%", "$42k"). Raw numbers are not
   *  formatted by the card; the host owns formatting so the same value
   *  can be "$42k" in one place and "42,000" in another. Optional only
   *  while `loading`. */
  value?: string | number;
  /** What the metric measures — always shown. */
  label: string;
  /** Direction of change. When absent, no trend indicator is rendered. */
  trend?: MetricCardTrend;
  /** The trend magnitude (e.g. "+12.5%", "-3.2%"). Shown only when `trend`
   *  is also provided; a magnitude with no direction has no meaning. */
  trendValue?: string;
  /** Context line under the value row — a period, a comparison base. */
  description?: string;
  /**
   * Renders the label and value as Skeleton placeholders sized to the real
   * layout, so the card keeps its height and does not reflow when data
   * lands.
   */
  loading?: boolean;
}>();

// `value` went optional for the loading state; this keeps a forgotten value
// from landing as an empty heading once data arrives.
watchEffect(() => {
  if (!props.loading && props.value === undefined) {
    console.warn(
      "[MetricCard] no `value` given and `loading` is false — the card renders an empty metric.",
    );
  }
});
</script>

<template>
  <div :aria-busy="loading || undefined" :class="cn('rounded-lg border border-border bg-card p-4')">
    <!-- Decorative icon — hidden from assistive tech because the label and
         value already carry the metric's meaning. -->
    <div
      v-if="$slots.icon"
      aria-hidden="true"
      class="mb-2 text-muted-foreground [&_svg]:h-4 [&_svg]:w-4"
    >
      <slot name="icon" />
    </div>
    <!-- Loading keeps the card's height by sizing each placeholder to the
         row it stands in for — a single generic bar would let the value
         land with a jolt. aria-hidden pairs with the parent's own
         aria-busy below. -->
    <template v-if="loading">
      <Skeleton variant="text" class="mb-2 h-3 w-20" />
      <div class="flex items-baseline gap-1.5">
        <Skeleton variant="text" class="h-7 w-24" />
      </div>
    </template>
    <template v-else>
      <p class="text-small text-muted-foreground">{{ label }}</p>
      <div class="flex items-baseline gap-1.5">
        <!-- `text-heading`, not a hand-assembled `text-2xl font-semibold
           tracking-tight`: the named rung is near-parity with that stack
           (1.5rem, weight 600) by design, and composing it here meant the KPI
           drifted silently if the scale ever moved. The two real deltas are
           deliberate — letter-spacing slackens from tight's −0.025em to the
           heading rung's −0.01em, and the line-height comes down to 1.2 —
           both invisible on a single baseline row like this one. -->
        <span class="text-heading text-foreground">
          {{ value }}
        </span>
        <span
          v-if="trend"
          :class="
            cn('inline-flex items-center gap-0.5 text-small font-medium', {
              'text-success-text': trend === 'up',
              'text-destructive-text': trend === 'down',
              'text-muted-foreground': trend === 'flat',
            })
          "
        >
          <!-- Up arrow: a single upward stroke with a chevron head. -->
          <svg
            v-if="trend === 'up'"
            class="inline h-3 w-3"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path d="M6 2v8M3 5l3-3 3 3" />
          </svg>
          <!-- Down arrow: a single downward stroke with a chevron head. -->
          <svg
            v-else-if="trend === 'down'"
            class="inline h-3 w-3"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path d="M6 10V2M3 7l3 3 3-3" />
          </svg>
          <!-- Flat: an em dash rather than a horizontal arrow — a horizontal
             arrow at this size reads as a minus sign or a separator. -->
          <span v-else aria-hidden="true">&mdash;</span>
          <span v-if="trendValue">{{ trendValue }}</span>
        </span>
      </div>
      <p v-if="description" class="mt-1 text-small text-muted-foreground">
        {{ description }}
      </p>
    </template>
  </div>
</template>
