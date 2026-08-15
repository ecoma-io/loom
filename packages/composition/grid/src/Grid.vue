<script lang="ts">
/**
 * Grid — CSS Grid with responsive column count.
 *
 * A grid that derives its column count from the container's own width
 * (`auto-fit` + `minmax`, never fixed `grid-cols-N` breakpoints), so the same
 * grid reflows inside a sidebar-narrowed workspace and full-bleed on an
 * ultra-wide monitor alike.
 *
 * A Grid is a component, not `grid grid-cols-3 gap-4`, because the responsive
 * column count is the component's job (a fixed count needs one breakpoint per
 * viewport and is already wrong the moment the grid sits in a sidebar narrower
 * than the viewport), and the gap tightens one step below `sm` like Stack and
 * DashboardGrid.
 */
export type GridGap = "sm" | "md" | "lg";

const gapClass: Record<GridGap, string> = {
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
    /** Narrowest a column may get before the grid drops to fewer columns. Any valid CSS length (e.g. "14rem"). */
    minColWidth?: string;
    /** Column/row gap step — mirrors Stack's scale. Tightens one notch below `sm`. */
    gap?: GridGap;
  }>(),
  { minColWidth: "16rem", gap: "md" },
);
</script>

<template>
  <div
    class="grid"
    :class="cn(gapClass[gap])"
    :style="{ gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minColWidth}), 1fr))` }"
  >
    <slot />
  </div>
</template>
