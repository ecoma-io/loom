<script lang="ts">
/**
 * AppShell — the universal application shell.
 *
 * A sidebar, a header, and a content area that reflows from mobile to
 * ultrawide. This is the layout most SaaS-style applications need: a
 * navigation sidebar on the left, a top header bar, and a scrollable content
 * region that fills the remaining space.
 *
 * The sidebar collapses intrinsically — no media query, no JavaScript. The
 * flex-wrap technique from the Sidebar composition primitive makes both panels
 * go full-width the moment the content cannot honour its `min-width`, so the
 * layout derives its own breakpoint from the container's width. The sidebar
 * width prop maps to named steps (sm/md/lg) rather than a pixel value so the
 * host names intent and the shell owns the geometry.
 *
 * The header slot is sticky within the content area so it stays visible while
 * the content scrolls. On ultrawide viewports, the content's horizontal
 * gutters widen so the extra viewport becomes intentional whitespace rather
 * than stretching lines of text.
 */
export type AppShellSidebarWidth = "sm" | "md" | "lg";

const sidebarWidthRem: Record<AppShellSidebarWidth, string> = {
  sm: "12rem",
  md: "16rem",
  lg: "20rem",
} as const;

export { sidebarWidthRem };
</script>

<script setup lang="ts">
import { cn } from "../../lib/cn";

withDefaults(
  defineProps<{
    /** Sidebar width step: sm (12rem), md (16rem, default), lg (20rem). */
    sidebarWidth?: AppShellSidebarWidth;
    /** Accessible name for the sidebar navigation landmark. */
    sidebarAriaLabel?: string;
  }>(),
  { sidebarWidth: "md", sidebarAriaLabel: "Navigation" },
);
</script>

<template>
  <!--
    `flex-wrap: wrap` is the intrinsic collapse mechanism. When the content
    panel can't fit its `min-width: 50%`, both panels wrap to full-width —
    the sidebar becomes a full-width section above the content. No media
    query; the layout derives its own breakpoint from the container's width.
  -->
  <div :class="cn('flex h-full')" :style="{ flexWrap: 'wrap' }">
    <!--
      The sidebar is a fixed-basis flex child that does not grow or shrink.
      flexShrink: 0 prevents the sidebar from compressing when the container
      narrows — instead, the content panel's min-width: 50% forces flex-wrap,
      and both panels stack at full width. This matches MasterDetail and
      SplitLayout, whose side panels also refuse to shrink.
    -->
    <aside
      :aria-label="sidebarAriaLabel"
      :style="{
        flexBasis: sidebarWidthRem[sidebarWidth],
        flexGrow: 0,
        flexShrink: 0,
      }"
      :class="cn('bg-sunken w-full')"
    >
      <slot name="sidebar" />
    </aside>

    <!--
      The content area takes all remaining space (`flex-grow: 999`) when the
      container is wide enough. Its `min-width: 50%` triggers wrapping below
      tablet-like widths. The header is sticky so it stays visible while the
      content scrolls. Gutters widen at wider breakpoints so ultrawide
      viewports add whitespace rails rather than stretching lines.
    -->
    <div
      :style="{
        flexBasis: 0,
        flexGrow: 999,
        flexShrink: 1,
        minWidth: '50%',
      }"
      :class="cn('bg-background flex min-w-0 flex-col')"
    >
      <header v-if="$slots.header" :class="cn('sticky top-0 z-20')">
        <slot name="header" />
      </header>

      <div :class="cn('flex-1 overflow-y-auto px-4 sm:px-6 3xl:px-8')">
        <slot />
      </div>
    </div>
  </div>
</template>
