<script lang="ts">
/**
 * Centered — a full-page layout with a centered content column.
 *
 * The simplest application shell: a header, a centered content column with a
 * max-width constraint, and a footer. On ultra-wide monitors the extra viewport
 * goes to intentional whitespace — lines of text stay readable rather than
 * stretching to fill the screen.
 *
 * The header and footer are NOT centered or max-width constrained: they span
 * the full viewport width. Only the default content slot is wrapped in the
 * Center composition primitive's centering logic (mx-auto, max-width, gutters).
 * This design lets navigation bars and status strips go edge-to-edge while the
 * main content stays comfortably readable.
 *
 * For pages that need only centered content without the page-level shell (no
 * header/footer, no min-height), use the Center composition primitive directly.
 */
export type CenteredMaxWidth = "sm" | "md" | "lg" | "xl" | "prose";

const maxWidthClass: Record<CenteredMaxWidth, string> = {
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
    /** Max-width for the centered column. Names readable intent rather than pixel values. */
    maxWidth?: CenteredMaxWidth;
    /** Whether to add horizontal gutters that widen at wider breakpoints. */
    gutter?: boolean;
  }>(),
  { maxWidth: "lg", gutter: true },
);
</script>

<template>
  <div :class="cn('min-h-dvh flex flex-col')">
    <!--
      Header and footer are full-width — they are NOT inside the centered
      wrapper. Navigation bars, status strips, and similar chrome need to span
      the viewport edge-to-edge.
    -->
    <header v-if="$slots.header">
      <slot name="header" />
    </header>

    <!--
      Only the content is centered with a max-width constraint. Gutters step up
      at `sm` and `3xl`: narrow viewports need less margin because the viewport
      itself is margin, and ultra-wide viewports need more so the gap between
      content and screen edge stays proportional.
    -->
    <div
      :class="
        cn(
          'mx-auto w-full flex-1',
          maxWidthClass[maxWidth],
          gutter ? 'px-4 sm:px-6 3xl:px-8' : undefined,
        )
      "
    >
      <slot />
    </div>

    <footer v-if="$slots.footer">
      <slot name="footer" />
    </footer>
  </div>
</template>
