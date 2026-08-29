<script lang="ts">
/**
 * Split — two-panel layout with intrinsic collapse.
 *
 * A flex row that places a side panel and a content area side by side, and
 * stacks them vertically once the container is too narrow for both. The side
 * panel gets a fixed minimum width; the content area grows to fill the
 * remaining space.
 *
 * This is the Every Layout "Sidebar" pattern, simplified for the common
 * two-panel case. The intrinsic collapse — panels stack when the container is
 * too narrow — avoids a breakpoint per viewport, and works identically inside
 * a sidebar-narrowed workspace and full-bleed on an ultra-wide monitor.
 *
 * A Split is a component, not a hand-rolled flex row with a media query,
 * because the wrap-and-floor technique is non-obvious and easy to get wrong,
 * and the stacking order (side above or below) is an intent the `side` prop
 * expresses.
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
import { cn } from "@ecoma-io/loom-core";

withDefaults(
  defineProps<{
    /** The side the panel sits on. Controls stacking order when collapsed: "left" stacks the panel above, "right" stacks it below. */
    side?: SplitSide;
    /** Minimum width for the side panel (e.g. "16rem"). The content area takes the rest. */
    minSideWidth?: string;
    /** Gap between the two panels. Tightens one notch below `sm` (except "none"). */
    gap?: SplitGap;
  }>(),
  { side: "left", minSideWidth: "16rem", gap: "md" },
);
</script>

<template>
  <!--
    `flex-wrap` is the intrinsic collapse mechanism: when the combined
    `min-width` of both panels exceeds the container, the second panel wraps
    to a new line. Where that happens is decided by the panels' own minimum
    widths — there is no breakpoint prop to set it with.
  -->
  <div
    :class="cn('flex flex-row', gap !== 'none' ? gapClass[gap] : undefined)"
    :style="{
      flexWrap: 'wrap',
    }"
  >
    <!--
      Document order follows `side`, so the wrapped stack never contradicts
      the side-by-side row and screen-reader order matches the visual one:
      content first when `side="right"`, side first when `side="left"`.
      flex-row (never reverse) plus this ordering is what makes the wrap
      produce content-above-panel for `side="right"`.
    -->
    <template v-if="side === 'right'">
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
    </template>
    <template v-else>
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
    </template>
  </div>
</template>
