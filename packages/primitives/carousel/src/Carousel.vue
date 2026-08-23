<script lang="ts">
import type { CarouselLabels } from "@ecoma-io/loom-labels";
import type { VNode } from "vue";

/**
 * Loom's English, co-located with the component so it tree-shakes with it,
 * and exported so a host can build a partial vocabulary against the real
 * thing rather than a transcription of it. `slide` receives the raw numbers
 * and returns the finished sentence — pluralisation and digit shaping stay
 * in the consumer's locale code, per the labels package's contract.
 */
export const CAROUSEL_LABELS: CarouselLabels = {
  region: "Carousel",
  previous: "Previous slide",
  next: "Next slide",
  slide: ({ position, total }) => `Slide ${String(position)} of ${String(total)}`,
};

/**
 * One slide per child of the default slot; a fragment child (a bare `v-for`
 * on the host) contributes its own children as further slides.
 */
function flatten(vnodes: VNode[]): VNode[] {
  return vnodes.flatMap((vnode) =>
    typeof vnode.type === "symbol" && Array.isArray(vnode.children)
      ? (vnode.children as VNode[])
      : [vnode],
  );
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useSlots } from "vue";
import { ChevronLeft, ChevronRight } from "@lucide/vue";
import IconButton from "@ecoma-io/loom-icon-button";
import { useLabels, type LabelOverrides } from "@ecoma-io/loom-labels";
import { cn, smoothScrollBehavior } from "@ecoma-io/loom-core";

const props = withDefaults(
  defineProps<{
    /** Names the whole region for assistive technology. */
    labels?: LabelOverrides<CarouselLabels>;
    /**
     * Wraps at both ends instead of stopping. Off by default: a carousel
     * that silently jumps from last back to first reads as a glitch unless
     * the product actually means it.
     */
    loop?: boolean;
  }>(),
  { loop: false },
);

// `text`, not `labels`: the prop of that name is one of the three sources
// this resolves, and a template reading the raw prop would be reading the
// overrides rather than the answer.
const text = useLabels("carousel", CAROUSEL_LABELS, () => props.labels);

// Invoked during render, never cached: a computed holding slot vnodes would
// freeze the list against a host that adds or removes slides reactively
// (Vue does not track dependencies used inside a slot from outside it).
const slots = useSlots();

// The slot function runs here on every render — fresh vnodes each time; only
// the slot lookup itself is captured in setup.
function slideVnodes(): VNode[] {
  return flatten(slots.default?.() ?? []);
}

function totalCount(): number {
  return slideVnodes().length;
}
const last = computed(() => totalCount() - 1);

const track = ref<HTMLElement | null>(null);
const index = ref(0);

function goTo(next: number): void {
  const el = track.value;
  const total = totalCount();
  if (!el || !total) return;
  let target = next;
  // Modulo of zero is NaN — an empty strip has nowhere to go.
  if (props.loop) target = ((next % total) + total) % total;
  else target = Math.max(0, Math.min(total - 1, target));
  index.value = target;
  el.scrollTo({ left: target * el.clientWidth, behavior: smoothScrollBehavior() });
}

const atStart = computed(() => !props.loop && index.value <= 0);
const atEnd = computed(() => !props.loop && index.value >= last.value);

/** Arrows walk pages while the strip itself holds focus; Home/End jump. */
function onKeydown(event: KeyboardEvent): void {
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    goTo(index.value + (event.key === "ArrowRight" ? 1 : -1));
  } else if (event.key === "Home") {
    event.preventDefault();
    goTo(0);
  } else if (event.key === "End") {
    event.preventDefault();
    goTo(last.value);
  }
}

// Touch swipes land here too: native scroll moves the strip and the reader's
// finger — not the component — decides where it settles. Work happens once
// per frame rather than on every scroll tick.
let frame = 0;
function onScroll(): void {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    const el = track.value;
    if (!el || !el.clientWidth) return;
    index.value = Math.max(0, Math.min(last.value, Math.round(el.scrollLeft / el.clientWidth)));
  });
}

onMounted(() => track.value?.addEventListener("scroll", onScroll, { passive: true }));
onBeforeUnmount(() => {
  track.value?.removeEventListener("scroll", onScroll);
  cancelAnimationFrame(frame);
});

const trackClasses = cn(
  "flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden rounded-md",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:shadow-halo",
);

// The controls float above media, so they carry their own ground instead of
// inheriting whatever slide sits beneath them.
const controlClasses =
  "absolute top-1/2 z-raised -translate-y-1/2 bg-background/80 shadow-sm hover:bg-background";
</script>

<template>
  <div role="region" aria-roledescription="carousel" :aria-label="text.region" class="relative">
    <!-- @slot One element per slide. Each becomes a full-width,
         snap-aligned page; give every child the same intrinsic height or pad
         it yourself. The slides are wrapped here rather than rendered bare so
         each can carry its own slide semantics. -->
    <!-- A named, focusable scroll container whose arrow keys page the
         strip: a genuine interaction on a genuinely interactive element.
         The accessibility rule cannot see that combination from a plain
         div, so it is answered here rather than by inventing a role the
         element does not have. -->
    <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -->
    <div ref="track" :class="trackClasses" tabindex="0" @keydown="onKeydown">
      <div
        v-for="(slide, i) in slideVnodes()"
        :key="i"
        role="group"
        aria-roledescription="slide"
        :aria-label="text.slide({ position: i + 1, total: totalCount() })"
        class="w-full shrink-0 snap-start"
      >
        <component :is="slide" />
      </div>
    </div>

    <IconButton
      variant="ghost"
      size="sm"
      :label="text.previous"
      :disabled="atStart"
      :class="cn(controlClasses, 'left-2')"
      @click="goTo(index - 1)"
    >
      <ChevronLeft class="h-4 w-4" aria-hidden="true" />
    </IconButton>
    <IconButton
      variant="ghost"
      size="sm"
      :label="text.next"
      :disabled="atEnd"
      :class="cn(controlClasses, 'right-2')"
      @click="goTo(index + 1)"
    >
      <ChevronRight class="h-4 w-4" aria-hidden="true" />
    </IconButton>

    <!-- Present from the first render: a live region mounted in the same
         moment as its text is a region assistive tech was not yet listening
         to. Position changes announce politely; nothing announces on load. -->
    <p class="sr-only" aria-live="polite">
      {{ text.slide({ position: index + 1, total: totalCount() }) }}
    </p>
  </div>
</template>
