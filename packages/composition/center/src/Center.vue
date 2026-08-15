<script lang="ts">
/**
 * Center — centered content with a max-width constraint.
 *
 * A horizontally centered block that caps its own width and widens its
 * gutters at wider breakpoints. Critical for ultra-wide viewports, where
 * content that stretches to infinity is unreadable: the extra viewport goes
 * to intentional whitespace, never to stretching lines of text or card grids.
 *
 * A Center is a component, not `mx-auto max-w-3xl px-4`, because the
 * gutters step up at breakpoints (the component's job, not every call
 * site's) and the `maxWidth` prop names readable intent rather than a
 * Tailwind size.
 */
export type CenterMaxWidth = "sm" | "md" | "lg" | "xl" | "prose";

const maxWidthClass: Record<CenterMaxWidth, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  prose: "max-w-prose",
} as const;

export { maxWidthClass };
</script>

<script setup lang="ts">
import { cn } from "@ecoma-io/loom-core";

withDefaults(
  defineProps<{
    /** Maximum content width — names intent rather than a pixel value. */
    maxWidth?: CenterMaxWidth;
    /** Whether to add horizontal gutters that widen at wider breakpoints. */
    gutter?: boolean;
  }>(),
  { maxWidth: "lg", gutter: true },
);
</script>

<template>
  <!--
    Gutters step up at `sm` and `3xl`: narrow viewports need less margin
    because the viewport itself is margin, and ultra-wide viewports need more
    so the gap between content and screen edge stays proportional.
  -->
  <div
    :class="cn(maxWidthClass[maxWidth], 'mx-auto', gutter ? 'px-4 sm:px-6 3xl:px-8' : undefined)"
  >
    <slot />
  </div>
</template>
