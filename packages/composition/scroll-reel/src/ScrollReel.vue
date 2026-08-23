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

/**
 * Loom's English, co-located with the component so it tree-shakes with it,
 * and exported so a host can build a partial vocabulary against the real
 * thing rather than a transcription of it. The type itself lives in the
 * labels registry (`ScrollReelLabels`) like every other slot's, so
 * `provideLoomLabels({ scrollReel: … })` reaches this component exactly as
 * it reaches every primitive — composition sits above labels in the layer
 * direction, and a host localising one reel should not have to learn a
 * second seam to do it.
 */
export const SCROLL_REEL_LABELS: ScrollReelLabels = {
  region: "Scrollable content",
};

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
import { useLabels, type LabelOverrides, type ScrollReelLabels } from "@ecoma-io/loom-labels";

const props = withDefaults(
  defineProps<{
    /** Scroll-snap alignment. "none" disables snap entirely. */
    snap?: ScrollReelSnap;
    /** Gap between items — mirrors Stack's scale. Tightens one notch below `sm`. */
    gap?: ScrollReelGap;
    /**
     * Names for what the reel says out loud, as any subset of
     * `ScrollReelLabels` — the per-instance correction over
     * `SCROLL_REEL_LABELS`, in the same shape a primitive's `labels` prop
     * takes.
     */
    labels?: LabelOverrides<ScrollReelLabels>;
  }>(),
  { snap: "start", gap: "md" },
);

// `text`, not `labels`: the prop of that name is one of the three sources this
// resolves (own prop, then the host vocabulary from `provideLoomLabels`, then
// these English defaults), and a template reading the raw prop would be
// reading the overrides rather than the answer.
const text = useLabels("scrollReel", SCROLL_REEL_LABELS, () => props.labels);

const reel = ref<HTMLDivElement | null>(null);

/**
 * The behaviour every scroll request below is handed. The reduced-motion rule
 * in `global.css` cannot reach this path on its own: an explicit
 * `"smooth"` in a `scrollTo` dictionary overrides the stylesheet's
 * `scroll-behavior` (that is what the spec says a non-`"auto"` behaviour
 * value is for), so the CSS kill-switch would stand by while JavaScript
 * animated the strip anyway. The softening has to happen here, at the
 * source.
 */
function scrollBehavior(): "auto" | "smooth" {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  } catch {
    // matchMedia may be unavailable; smooth is the behaviour being replaced.
    return "smooth";
  }
}

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

  const behavior = scrollBehavior();
  if (event.key === "Home") {
    el.scrollTo({ left: 0, behavior });
    return;
  }
  if (event.key === "End") {
    el.scrollTo({ left: el.scrollWidth, behavior });
    return;
  }

  // Find the next snap-aligned child in the scroll direction.
  const children = [...el.children] as HTMLElement[];
  const scrollEdge = direction === 1 ? el.scrollLeft + el.clientWidth : el.scrollLeft;

  for (const child of direction === 1 ? children : children.reverse()) {
    const childEdge = direction === 1 ? child.offsetLeft : child.offsetLeft + child.offsetWidth;
    const isNext = direction === 1 ? childEdge > scrollEdge - 1 : childEdge < scrollEdge + 1;
    if (isNext) {
      child.scrollIntoView({ behavior, block: "nearest", inline: "start" });
      break;
    }
  }
}
</script>

<template>
  <!-- `role="region"` + `tabindex="0"` + an accessible name make this a named,
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
    :aria-label="text.region"
    @keydown="onKeydown"
  >
    <slot />
  </div>
</template>
