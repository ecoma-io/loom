<script lang="ts">
/**
 * Dashboard — a dashboard shell: optional sidebar + auto-reflowing tile grid
 * for panels, with an optional aside for supplementary metrics on ultrawide
 * viewports.
 *
 * The layout composes three composition patterns into a single responsive
 * shell. The innermost is the auto-fit grid from DashboardGrid/Grid: the tile
 * column count derives from the container's own width, so the same grid
 * reflows inside a sidebar-narrowed workspace and full-bleed on an ultra-wide
 * monitor, with zero Tailwind breakpoints authored here or at the call site.
 *
 * The sidebar and aside use the Every Layout "Sidebar" flex-wrap technique:
 * each panel gets a fixed flex-basis and the grid area gets `flex-grow: 999`,
 * so when the container cannot fit the content's minimum, both panels wrap to
 * full-width and the sidebar or aside stacks above the grid instead of sitting
 * beside it. No media query, no JavaScript — the layout derives its own
 * breakpoints from the container's width.
 *
 * The `#aside` slot is gated behind a `2xl` breakpoint because supplementary
 * metrics are a luxury that only wide desktops can afford: the aside is hidden
 * below that width and the grid takes the full width, preventing a cramped
 * two-panel layout where neither panel has room to breathe.
 *
 * The header slot is full-width, above the sidebar+grid row, so a top
 * navigation bar or title row never competes for horizontal space with the
 * sidebar.
 */
export type DashboardMinTileWidth = string;

const gapClass: Record<string, string> = {
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
    /** Narrowest a tile may get before the grid drops to fewer columns. */
    minTileWidth?: DashboardMinTileWidth;
    /** Grid gap step. Tightens one notch below sm. */
    gap?: "sm" | "md" | "lg";
  }>(),
  { minTileWidth: "16rem", gap: "md" },
);
</script>

<template>
  <div :class="cn('min-h-dvh flex flex-col')">
    <!--
      The header is full-width and above the sidebar+grid row, so a
      navigation bar or title row never competes for horizontal space.
    -->
    <header v-if="$slots.header">
      <slot name="header" />
    </header>

    <!--
      The sidebar+grid row uses flex-wrap. The sidebar gets a fixed
      flex-basis (~16rem) and the grid area gets `flex-grow: 999`, so
      when the container is too narrow both panels wrap to full-width —
      the sidebar stacks above the grid. No media query; the layout
      derives its own breakpoint from the container's width.
    -->
    <div
      :style="{ flexWrap: 'wrap' }"
      :class="cn('flex flex-1', $slots.sidebar ? 'flex-row' : undefined)"
    >
      <!--
        The sidebar panel. Fixed-basis, no growth — it recedes into the
        sunken elevation layer when present, matching the AppShell pattern.
      -->
      <aside
        v-if="$slots.sidebar"
        :style="{
          flexBasis: '16rem',
          flexGrow: 0,
          flexShrink: 1,
        }"
        :class="cn('bg-sunken w-full')"
      >
        <slot name="sidebar" />
      </aside>

      <!--
        The main area: the auto-fit tile grid + an optional aside for
        supplementary metrics on ultrawide viewports.

        `flex-grow: 999` ensures this area takes all remaining space
        when the container is wide enough. Its `min-width: 50%` triggers
        wrapping below tablet-like widths, making the sidebar stack above.

        Gutters widen at wider breakpoints so ultrawide viewports add
        whitespace rails rather than stretching lines.
      -->
      <div
        :style="{
          flexBasis: 0,
          flexGrow: 999,
          flexShrink: 1,
          minWidth: '50%',
        }"
        :class="cn('flex min-w-0 flex-col')"
      >
        <div
          :class="
            cn(
              'flex-1 px-4 sm:px-6 3xl:px-8',
              $slots.aside ? 'flex flex-row 2xl:flex-row max-2xl:flex-col' : undefined,
            )
          "
          :style="$slots.aside ? { flexWrap: 'wrap' } : undefined"
        >
          <!--
            The tile grid. `auto-fit` + `minmax` recomputes the column
            count from the container's own width — it reflows inside a
            sidebar-narrowed workspace and full-bleed on an ultra-wide
            monitor, with zero Tailwind breakpoints authored here. The
            `minmax` lower bound is wrapped in `min(100%, …)` so a tile
            never forces horizontal overflow on a container narrower than
            `minTileWidth` itself.
          -->
          <div
            :class="
              cn('grid', gapClass[gap], $slots.aside ? 'flex-grow-[999] flex-shrink-1' : undefined)
            "
            :style="{
              gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minTileWidth}), 1fr))`,
              ...($slots.aside ? { flexBasis: 0, minWidth: '60%' } : {}),
            }"
          >
            <slot />
          </div>

          <!--
            The aside slot: supplementary metrics/info panels visible only
            on wide desktops (from `2xl` breakpoint). Uses the same
            flex-wrap Sidebar pattern: the aside gets a fixed basis and
            the grid area grows to fill the remaining space. Below `2xl`,
            the aside is hidden entirely — metrics are a luxury that only
            wide desktops can afford.
          -->
          <aside
            v-if="$slots.aside"
            :style="{
              flexBasis: '14rem',
              flexGrow: 0,
              flexShrink: 1,
            }"
            :class="cn('hidden w-full 2xl:block')"
          >
            <slot name="aside" />
          </aside>
        </div>
      </div>
    </div>
  </div>
</template>
