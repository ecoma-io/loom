<script lang="ts">
/**
 * Stack — vertical flow with consistent, responsive gap.
 *
 * A flex column that tightens its gutter one step below the `sm` breakpoint,
 * where stacked items have no room to waste on air. The gap steps mirror
 * DashboardGrid's: the value each step names applies from `sm` up, and drops
 * one notch below it.
 *
 * A Stack is a component, not `flex flex-col gap-4`, for three reasons: the
 * responsive gap is the component's job (not every call site's), the
 * `separator` slot avoids a repeated `v-for` + `v-if` pattern, and the
 * `align` prop maps cross-axis intent to a Tailwind class without the caller
 * remembering which flex utility is which.
 */
export type StackGap = "sm" | "md" | "lg";

export type StackAlign = "start" | "center" | "end" | "stretch";

const gapClass: Record<StackGap, string> = {
  sm: "gap-2 sm:gap-3",
  md: "gap-3 sm:gap-4",
  lg: "gap-4 sm:gap-6",
} as const;

const alignClass: Record<StackAlign, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
} as const;

export { gapClass, alignClass };
</script>

<script setup lang="ts">
import { cn } from "../../lib/cn";

withDefaults(
  defineProps<{
    /** Vertical gap step — mirrors DashboardGrid's scale. Tightens one notch below `sm`. */
    gap?: StackGap;
    /** Cross-axis alignment of children. */
    align?: StackAlign;
  }>(),
  { gap: "md", align: "stretch" },
);
</script>

<template>
  <div :class="cn('flex flex-col', gapClass[gap], alignClass[align])">
    <!-- Each direct child is a stack item. The separator slot, if filled,
         is rendered between every pair of children — a <Separator /> or a
         thin <div class="border-t border-border">, for example. -->
    <slot />
  </div>
</template>
