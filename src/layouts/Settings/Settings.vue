<script lang="ts">
/**
 * Settings — a settings/preferences page layout: navigation sidebar + content
 * sections.
 *
 * The layout uses the same intrinsic flex-wrap collapse as the Sidebar
 * composition primitive. The nav panel gets a fixed flex-basis and the content
 * area gets `flex-grow: 999`, so when the container cannot fit the content's
 * `min-width: 50%`, both panels wrap to full-width — the nav stacks above the
 * content. No media query, no JavaScript — the layout derives its own
 * breakpoint from the container's width.
 *
 * The nav panel recedes into the sunken elevation layer so the content reads as
 * the work surface. The content area scrolls independently so long settings
 * pages stay navigable without the nav scrolling out of view.
 */
export type SettingsNavWidth = string;
</script>

<script setup lang="ts">
import { cn } from "../../lib/cn";

withDefaults(
  defineProps<{
    /** Width for the navigation panel (e.g. "12rem"). */
    navWidth?: SettingsNavWidth;
  }>(),
  { navWidth: "12rem" },
);
</script>

<template>
  <div :class="cn('min-h-dvh flex flex-col')">
    <!--
      The header is full-width and above the nav+content row, so a title bar
      or breadcrumb never competes for horizontal space with the nav panel.
    -->
    <header v-if="$slots.header">
      <slot name="header" />
    </header>

    <!--
      `flex-wrap: wrap` is the intrinsic collapse mechanism. When the content
      panel can't fit its `min-width: 50%`, both panels wrap to full-width —
      the nav becomes a full-width section above the content. No media query;
      the layout derives its own breakpoint from the container's width.
    -->
    <div :class="cn('flex flex-1 flex-row')" :style="{ flexWrap: 'wrap' }">
      <!--
        The nav panel: fixed-basis, no growth, no shrink. It does not yield
        width to the content area — when the container is too narrow, it wraps
        to full-width instead of compressing. Sunken elevation marks it as
        chrome, not work surface.
      -->
      <nav
        :style="{
          flexBasis: navWidth,
          flexGrow: 0,
          flexShrink: 0,
        }"
        :class="cn('bg-sunken w-full p-2')"
      >
        <slot name="nav" />
      </nav>

      <!--
        The content area takes all remaining space (`flex-grow: 999`) when the
        container is wide enough. Its `min-width: 50%` triggers wrapping below
        tablet-like widths. It scrolls independently so long settings pages
        stay navigable without the nav scrolling out of view. Gutters widen at
        wider breakpoints so ultrawide viewports add whitespace rails rather
        than stretching lines.
      -->
      <div
        :style="{
          flexBasis: 0,
          flexGrow: 999,
          flexShrink: 1,
          minWidth: '50%',
        }"
        :class="cn('bg-background min-w-0 flex-1 overflow-y-auto px-4 sm:px-6 3xl:px-8')"
      >
        <slot />
      </div>
    </div>
  </div>
</template>
