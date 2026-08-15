<script lang="ts">
/**
 * MasterDetail — a master list panel and a detail panel side by side.
 *
 * The master/detail pattern is the layout that list-driven applications reach
 * for: a selectable list on one side, its content on the other. Mail clients,
 * file browsers, and settings pages all share this structure.
 *
 * The intrinsic collapse from the Split composition primitive is reused directly
 * — `flex-wrap` plus a `min-width: 50%` guard on the detail panel — so the
 * layout derives its own breakpoint from the container's width rather than a
 * viewport media query. Below the collapse width the panels stack vertically;
 * the master list sits above the detail area.
 *
 * The master panel does not shrink (`flex-shrink: 0`), unlike the AppShell
 * sidebar, because a master list whose column widths change under compression
 * is harder to scan than one that holds its shape and lets the detail panel
 * absorb the squeeze. The detail panel scrolls independently so long lists of
 * content never push the master list off-screen.
 */
export type MasterDetailMinMasterWidth = string;

export type MasterDetailGap = "sm" | "md" | "lg" | "none";

const gapClass: Record<Exclude<MasterDetailGap, "none">, string> = {
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
    /** Minimum width for the master panel (e.g. "14rem"). The detail area takes the rest. */
    minMasterWidth?: MasterDetailMinMasterWidth;
    /** Gap between master and detail panels. Tightens one notch below sm. */
    gap?: MasterDetailGap;
  }>(),
  { minMasterWidth: "14rem", gap: "none" },
);
</script>

<template>
  <!--
    `flex-wrap: wrap` is the intrinsic collapse mechanism. When the detail
    panel cannot honour its `min-width: 50%`, both panels wrap to full-width —
    the master list sits above the detail area. No media query; the layout
    derives its own breakpoint from the container's width.
  -->
  <div
    :class="cn('flex h-full', gap !== 'none' ? gapClass[gap] : undefined)"
    :style="{ flexWrap: 'wrap' }"
  >
    <!--
      The master panel holds a fixed basis and does not grow or shrink. It sits
      on the sunken elevation so the detail area reads as the work surface
      lifted above navigation chrome.
    -->
    <div
      :style="{
        flexBasis: minMasterWidth,
        flexGrow: 0,
        flexShrink: 0,
      }"
      :class="cn('bg-sunken w-full')"
    >
      <slot name="master" />
    </div>

    <!--
      The detail panel takes all remaining space (`flex-grow: 999`) when the
      container is wide enough. Its `min-width: 50%` triggers wrapping below
      tablet-like widths. It scrolls independently so long content never pushes
      the master list off-screen. Gutters widen at wider breakpoints so
      ultrawide viewports add whitespace rails rather than stretching lines.
    -->
    <div
      :style="{
        flexBasis: 0,
        flexGrow: 999,
        flexShrink: 1,
        minWidth: '50%',
      }"
      :class="cn('bg-background overflow-y-auto px-4 sm:px-6 3xl:px-8')"
    >
      <slot />
    </div>
  </div>
</template>
