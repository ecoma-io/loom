<script lang="ts">
/**
 * SplitLayout — full-page two-panel layout with intrinsic collapse.
 *
 * A SplitLayout extends the Split composition primitive's intrinsic collapse
 * into a full-page application shell: a side panel and a main content area,
 * with an optional full-width header above. It is the layout a two-column
 * application reaches for — a settings page with a nav rail, a documentation
 * site with a sidebar, a chat interface with a contact list.
 *
 * The intrinsic collapse from the Split composition primitive is reused
 * directly — `flex-wrap` plus a `min-width: 50%` guard on the content panel —
 * so the layout derives its own breakpoint from the container's width rather
 * than a viewport media query. Below the collapse width the panels stack
 * vertically; the side panel sits above the content when `side` is `"left"`,
 * below it when `side` is `"right"`.
 *
 * The header slot spans the full width, above the split row, so an application
 * header bar stays visible regardless of collapse state. Both panels carry
 * gutters that widen at wider breakpoints, so ultrawide viewports add
 * whitespace rails rather than stretching lines of text.
 */
export type SplitLayoutGap = "sm" | "md" | "lg" | "none";

const gapClass: Record<Exclude<SplitLayoutGap, "none">, string> = {
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
    /** Which side the primary panel sits on. Controls stacking order when collapsed: "left" stacks the side panel above, "right" stacks it below. */
    side?: "left" | "right";
    /** Minimum width for the side panel (e.g. "16rem"). The content area takes the rest. */
    minSideWidth?: string;
    /** Gap between panels. Tightens one notch below sm (except "none"). */
    gap?: SplitLayoutGap;
  }>(),
  { side: "left", minSideWidth: "16rem", gap: "none" },
);
</script>

<template>
  <!--
    The root is a full-height column so the header can span the top while the
    split row fills the rest. `min-h-dvh` makes the layout at least one
    viewport tall even when content is short, so the side panel background
    fills the screen rather than stopping at the content's natural height.
  -->
  <div :class="cn('min-h-dvh flex flex-col')">
    <!--
      The header spans the full width, above the split row. It is not sticky
      here — that is the host's decision, because whether an application
      header pins depends on the content below it.
    -->
    <header v-if="$slots.header">
      <slot name="header" />
    </header>

    <!--
      `flex-wrap: wrap` is the intrinsic collapse mechanism. When the content
      panel cannot honour its `min-width: 50%`, both panels wrap to full-width
      — the side panel stacks above or below the content depending on `side`.
      No media query; the layout derives its own breakpoint from the
      container's width.
    -->
    <div
      :class="cn('flex flex-1 flex-row', gap !== 'none' ? gapClass[gap] : undefined)"
      :style="{ flexWrap: 'wrap' }"
    >
      <!--
        Document order follows `side`, so screen-reader order matches the
        visual one and the wrapped stack never contradicts the row: content
        first when `side="right"` (stack: content above, panel below), side
        first when `side="left"`. flex-row (never reverse) plus this ordering
        is what makes the wrap produce content-above-panel for `side="right"`.
      -->
      <template v-if="side === 'right'">
        <!-- Content: takes all remaining space (flex-grow: 999); its
             min-width: 50% triggers wrapping below tablet-like widths. Scrolls
             independently so long content never pushes the panel off-screen. -->
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
        <!-- The side panel holds a fixed basis and does not grow; the sunken
             elevation makes the content read as the work surface above
             navigation chrome. -->
        <div
          :style="{
            flexBasis: minSideWidth,
            flexGrow: 0,
            flexShrink: 0,
            minWidth: minSideWidth,
          }"
          :class="cn('bg-sunken w-full px-4 sm:px-6 3xl:px-8')"
        >
          <slot name="side" />
        </div>
      </template>
      <template v-else>
        <!-- The side panel holds a fixed basis and does not grow; the sunken
             elevation makes the content read as the work surface above
             navigation chrome. -->
        <div
          :style="{
            flexBasis: minSideWidth,
            flexGrow: 0,
            flexShrink: 0,
            minWidth: minSideWidth,
          }"
          :class="cn('bg-sunken w-full px-4 sm:px-6 3xl:px-8')"
        >
          <slot name="side" />
        </div>
        <!-- Content: takes all remaining space (flex-grow: 999); its
             min-width: 50% triggers wrapping below tablet-like widths. Scrolls
             independently so long content never pushes the panel off-screen. -->
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
      </template>
    </div>
  </div>
</template>
