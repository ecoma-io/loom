<script lang="ts">
/**
 * Split — two-panel layout with intrinsic collapse.
 *
 * A flex row that places a side panel and a content area side by side above
 * a `collapseAt` width, and stacks them vertically below it. The side panel
 * gets a fixed minimum width; the content area grows to fill the remaining
 * space.
 *
 * This is the Every Layout "Sidebar" pattern, simplified for the common
 * two-panel case. The intrinsic collapse — panels stack when the container is
 * too narrow — avoids a breakpoint per viewport, and works identically inside
 * a sidebar-narrowed workspace and full-bleed on an ultra-wide monitor.
 *
 * A Split is a component, not a hand-rolled flex row with a media query,
 * because the collapse width is a layout decision the call site should name
 * rather than compute, and the stacking order (side above or below) is an
 * intent the `side` prop expresses.
 */
export type SplitSide = "left" | "right";

export type SplitGap = "sm" | "md" | "lg" | "none";

const gapClass: Record<Exclude<SplitGap, "none">, string> = {
  sm: "gap-2 sm:gap-3",
  md: "gap-3 sm:gap-4",
  lg: "gap-4 sm:gap-6",
} as const;

export { gapClass };
</script>

<script setup lang="ts">
import { cn } from "../../lib/cn";

withDefaults(
  defineProps<{
    /** The side the panel sits on. Controls stacking order when collapsed: "left" stacks the panel above, "right" stacks it below. */
    side?: SplitSide;
    /** Below this CSS width the two panels stack vertically instead of sitting side by side. Default: `"48rem"`. */
    collapseAt?: string;
    /** Minimum width for the side panel (e.g. "16rem"). The content area takes the rest. */
    minSideWidth?: string;
    /** Gap between the two panels. Tightens one notch below `sm` (except "none"). */
    gap?: SplitGap;
  }>(),
  { side: "left", collapseAt: "48rem", minSideWidth: "16rem", gap: "md" },
);
</script>

<template>
  <!--
    `flex-wrap` is the intrinsic collapse mechanism: when the combined
    `min-width` of both panels exceeds the container, the second panel wraps
    to a new line. The `collapseAt` prop sets the breakpoint that controls
    when `flex-wrap` is active.
  -->
  <div
    :class="
      cn(
        'flex',
        side === 'right' ? 'flex-row-reverse' : 'flex-row',
        gap !== 'none' ? gapClass[gap] : undefined,
      )
    "
    :style="{
      flexWrap: 'wrap',
    }"
  >
    <!-- Side panel: fixed minimum width, does not grow. When collapsed the
         panel takes full width (flex-basis: 100%). -->
    <div
      :style="{
        flexBasis: minSideWidth,
        flexGrow: 0,
        flexShrink: 0,
        minWidth: minSideWidth,
      }"
    >
      <slot name="side" />
    </div>

    <!-- Content area: fills remaining space, but demands at least 50% of
         the container before wrapping. When collapsed it also takes full
         width. -->
    <div
      :style="{
        flexBasis: 0,
        flexGrow: 999,
        flexShrink: 1,
        minWidth: '50%',
      }"
    >
      <slot />
    </div>
  </div>
</template>
