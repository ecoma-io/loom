<script setup lang="ts">
/**
 * DashboardGrid — the reflowing tile grid a dashboard's panels sit in: a CSS
 * grid that fits as many `minTileWidth`-wide tracks as the container allows,
 * so a KPI row and a couple of wider panels share one layout without the
 * host authoring a single breakpoint.
 *
 * `auto-fit` + `minmax` (never fixed `grid-cols-N` breakpoints) is the
 * deliberate choice: a fixed column count needs one breakpoint per host
 * viewport, while auto-fit recomputes the column count from the container's
 * own width — it reflows identically inside a sidebar-narrowed workspace and
 * full-bleed on an ultra-wide monitor, with zero Tailwind breakpoints
 * authored here or at the call site. The `minmax` lower bound is wrapped in
 * `min(100%, …)` so a tile never forces horizontal overflow on a container
 * narrower than `minTileWidth` itself.
 *
 * Presentational only: panels arrive through the default slot, and a panel
 * spans multiple tracks with its own `col-span-*` utility at the call
 * site — the grid does not know or count how many panels it holds.
 */
withDefaults(
  defineProps<{
    /** Narrowest a tile may get before the grid drops to fewer columns. Any valid CSS length (e.g. "14rem"). */
    minTileWidth?: string;
    /** Row/column gap step — mirrors Surface's `pad` scale at `sm` and up (sm 12px · md 16px · lg 24px); each step drops one notch below `sm`. */
    gap?: "sm" | "md" | "lg";
  }>(),
  { minTileWidth: "16rem", gap: "md" },
);

// One notch tighter below the `sm` breakpoint. A gutter is spent viewport, and
// on a phone the grid is already single-column — 24px of air between stacked
// tiles buys no separation the tile borders do not already give, it just
// pushes the second tile off screen. From `sm` up each step is its
// documented value.
const gapClass = {
  sm: "gap-2 sm:gap-3",
  md: "gap-3 sm:gap-4",
  lg: "gap-4 sm:gap-6",
} as const;
</script>

<template>
  <div
    class="grid"
    :class="gapClass[gap]"
    :style="{ gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minTileWidth}), 1fr))` }"
  >
    <slot />
  </div>
</template>
