<script lang="ts">
/**
 * ScrollReel — horizontal scrolling strip with scroll-snap.
 *
 * A touch-friendly, keyboard-navigable horizontal scroll container with
 * optional scroll-snap alignment. Arrow keys scroll to the next or previous
 * snap point; the `Home` and `End` keys jump to the start or end of the
 * strip.
 *
 * A ScrollReel is a component, not `overflow-x-auto snap-x snap-mandatory`,
 * because keyboard accessibility for scroll-snap requires JavaScript (arrow
 * keys must find the next snap-aligned child and scroll it into view), and
 * the gap tightens one step below `sm` like Stack and DashboardGrid.
 */
export type ScrollReelSnap = "start" | "center" | "end" | "none";

export type ScrollReelGap = "sm" | "md" | "lg";

const snapClass: Record<ScrollReelSnap, string> = {
  start: "snap-x snap-mandatory snap-start",
  center: "snap-x snap-mandatory snap-center",
  end: "snap-x snap-mandatory snap-end",
  // `none` means no snap alignment — items scroll freely.
  none: "",
} as const;

const gapClass: Record<ScrollReelGap, string> = {
  sm: "gap-2 sm:gap-3",
  md: "gap-3 sm:gap-4",
  lg: "gap-4 sm:gap-6",
} as const;

export { snapClass, gapClass };
</script>

<script setup lang="ts">
import { ref } from "vue";
import { cn } from "@ecoma-io/loom-core";

withDefaults(
  defineProps<{
    /** Scroll-snap alignment. "none" disables snap entirely. */
    snap?: ScrollReelSnap;
    /** Gap between items — mirrors Stack's scale. Tightens one notch below `sm`. */
    gap?: ScrollReelGap;
  }>(),
  { snap: "start", gap: "md" },
);

const reel = ref<HTMLDivElement | null>(null);

/**
 * Keyboard navigation for scroll-snap: arrow keys scroll to the next or
 * previous snap-aligned child. Without this, the browser's default arrow-key
 * behaviour scrolls by a fixed pixel amount that rarely aligns with snap
 * points, leaving the strip between two items.
 */
function onKeydown(event: KeyboardEvent) {
  const el = reel.value;
  if (!el) return;

  const direction = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
  if (direction === 0 && event.key !== "Home" && event.key !== "End") return;

  event.preventDefault();

  if (event.key === "Home") {
    el.scrollTo({ left: 0, behavior: "smooth" });
    return;
  }
  if (event.key === "End") {
    el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
    return;
  }

  // Find the next snap-aligned child in the scroll direction.
  const children = [...el.children] as HTMLElement[];
  const scrollEdge = direction === 1 ? el.scrollLeft + el.clientWidth : el.scrollLeft;

  for (const child of direction === 1 ? children : children.reverse()) {
    const childEdge = direction === 1 ? child.offsetLeft : child.offsetLeft + child.offsetWidth;
    const isNext = direction === 1 ? childEdge > scrollEdge - 1 : childEdge < scrollEdge + 1;
    if (isNext) {
      child.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
      break;
    }
  }
}
</script>

<template>
  <!-- `role="region"` + `tabindex="0"` + `aria-label` make this a named,
    focusable landmark region. The keyboard handler is what makes the
    scroll-snap strip navigable by arrow keys — a genuine interaction on
    a genuinely interactive element. The rule does not account for
    non-interactive ARIA roles with an explicit tabindex. -->
  <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -->
  <div
    ref="reel"
    class="overflow-x-auto"
    :class="cn('flex flex-row', snapClass[snap], gapClass[gap])"
    tabindex="0"
    role="region"
    aria-label="Scrollable content"
    @keydown="onKeydown"
  >
    <slot />
  </div>
</template>
