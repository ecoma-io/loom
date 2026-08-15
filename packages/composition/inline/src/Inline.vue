<script lang="ts">
/**
 * Inline — horizontal flow with wrap, consistent gap.
 *
 * A flex row that wraps naturally at the container edge and tightens its gutter
 * one step below the `sm` breakpoint. The gap steps mirror Stack's and
 * DashboardGrid's: the value each step names applies from `sm` up, and drops
 * one notch below it.
 *
 * An Inline is a component, not `flex flex-row flex-wrap gap-4`, because the
 * responsive gap is the component's job, the `align` prop maps cross-axis
 * intent to a class, and the `wrap` prop controls line-wrapping behaviour.
 */
export type InlineGap = "sm" | "md" | "lg";

export type InlineAlign = "start" | "center" | "end" | "stretch" | "baseline";

const gapClass: Record<InlineGap, string> = {
  sm: "gap-2 sm:gap-3",
  md: "gap-3 sm:gap-4",
  lg: "gap-4 sm:gap-6",
} as const;

const alignClass: Record<InlineAlign, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
} as const;

export { gapClass, alignClass };
</script>

<script setup lang="ts">
import { cn } from "@ecoma-io/loom-core";

withDefaults(
  defineProps<{
    /** Horizontal gap step — mirrors Stack's scale. Tightens one notch below `sm`. */
    gap?: InlineGap;
    /** Cross-axis alignment of children. */
    align?: InlineAlign;
    /** Whether items wrap to new lines when they exceed the container width. */
    wrap?: boolean;
  }>(),
  { gap: "md", align: "stretch", wrap: true },
);
</script>

<template>
  <div
    :class="
      cn('flex flex-row', gapClass[gap], alignClass[align], wrap ? 'flex-wrap' : 'flex-nowrap')
    "
  >
    <slot />
  </div>
</template>
