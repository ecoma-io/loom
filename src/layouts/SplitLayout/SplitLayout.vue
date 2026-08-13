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
export type SplitLayoutCollapseAt = string;

export type SplitLayoutGap = "sm" | "md" | "lg" | "none";

const gapClass: Record<Exclude<SplitLayoutGap, "none">, string> = {
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
    /** Which side the primary panel sits on. Controls stacking order when collapsed: "left" stacks the side panel above, "right" stacks it below. */
    side?: "left" | "right";
    /** Below this CSS width the two panels stack vertically instead of sitting side by side. Default: `"48rem"`. */
    collapseAt?: SplitLayoutCollapseAt;
    /** Minimum width for the side panel (e.g. "16rem"). The content area takes the rest. */
    minSideWidth?: string;
    /** Gap between panels. Tightens one notch below sm (except "none"). */
    gap?: SplitLayoutGap;
  }>(),
  { side: "left", collapseAt: "48rem", minSideWidth: "16rem", gap: "none" },
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
      :class="
        cn(
          'flex flex-1',
          side === 'right' ? 'flex-row-reverse' : 'flex-row',
          gap !== 'none' ? gapClass[gap] : undefined,
        )
      "
      :style="{ flexWrap: 'wrap' }"
    >
      <!--
        The side panel holds a fixed basis and does not grow. It sits on the
        sunken elevation so the content area reads as the work surface lifted
        above navigation chrome. Gutters widen at wider breakpoints.
      -->
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

      <!--
        The content panel takes all remaining space (`flex-grow: 999`) when the
        container is wide enough. Its `min-width: 50%` triggers wrapping below
        tablet-like widths. It scrolls independently so long content never
        pushes the side panel off-screen. Gutters widen at wider breakpoints so
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
  </div>
</template>
