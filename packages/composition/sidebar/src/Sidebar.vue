<script lang="ts">
/**
 * Sidebar — content + sidebar with intrinsic CSS collapse.
 *
 * The Every Layout "Sidebar" pattern: the sidebar gets a fixed `flex-basis`
 * and the content gets `flex-grow: 999`, so the layout wraps and both panels
 * go full-width the moment the content can't fit its `contentMin` percentage.
 * No media query, no JavaScript — the layout derives its own breakpoint from
 * the container's width.
 *
 * A Sidebar is a component because the `calc()` technique for intrinsic
 * sidebar width is non-obvious and easy to get wrong, and Loom wrapping it
 * prevents footguns. It differs from Split in that the content area is the
 * star — it grows to fill all available space — and the sidebar has a
 * preferred, not a minimum, width.
 */
export type SidebarSide = "left" | "right";
</script>

<script setup lang="ts">
import { cn } from "@ecoma-io/loom-core";

withDefaults(
  defineProps<{
    /** Which side the sidebar sits on. Controls flex direction and stacking order. */
    side?: SidebarSide;
    /** Preferred width for the sidebar (e.g. "16rem"). The sidebar does not grow. */
    sideWidth?: string;
    /** Minimum percentage of the container the content demands before the layout wraps. Default: `"50%"`. */
    contentMin?: string;
    /** Whether to add a gap between the two panels. Default: `true`. */
    gap?: boolean;
  }>(),
  { side: "left", sideWidth: "16rem", contentMin: "50%", gap: true },
);
</script>

<template>
  <!--
    `flex-wrap: wrap` is the intrinsic collapse mechanism. When the content
    can't fit its `contentMin`, it wraps to a new line and both panels take
    full width — the sidebar becomes a full-width section above or below the
    content, depending on `side`.

    The sidebar's `flex-basis` is its preferred width. The content's
    `flex-grow: 999` ensures it takes all remaining space when there is room,
    but its `flex-basis: 0` and `min-width: contentMin` trigger wrapping
    when there isn't.
  -->
  <div
    :class="
      cn(
        'flex',
        side === 'right' ? 'flex-row-reverse' : 'flex-row',
        gap ? 'gap-3 sm:gap-4' : undefined,
      )
    "
    :style="{ flexWrap: 'wrap' }"
  >
    <div
      :style="{
        flexBasis: sideWidth,
        flexGrow: 0,
        flexShrink: 1,
      }"
    >
      <slot name="side" />
    </div>

    <div
      :style="{
        flexBasis: 0,
        flexGrow: 999,
        flexShrink: 1,
        minWidth: contentMin,
      }"
    >
      <slot />
    </div>
  </div>
</template>
