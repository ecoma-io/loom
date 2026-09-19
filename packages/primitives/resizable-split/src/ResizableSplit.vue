<script setup lang="ts">
/**
 * ResizableSplit — a two-panel split with a drag- and keyboard-resizable
 * separator.
 *
 * One panel's width is a plain number controlled through `v-model` — the
 * host owns persistence, so a saved layout is a `v-model` bound to storage,
 * not a behaviour this primitive duplicates. `min`/`max` clamp every input
 * path (arrows, drag, double-click), arrows move by `step`, and double-click
 * restores `defaultWidth`. There is no animation anywhere in the control, so
 * `prefers-reduced-motion` needs no kill-switch of its own.
 *
 * The resizable panel is `side`-relative: `side="left"` (default) places it
 * first with the separator at its right edge, `side="right"` mirrors the
 * row. The arrow keys act on the panel's width, not the separator's screen
 * position, so Left always narrows the resizable panel and Right always
 * widens it.
 */
import { computed, ref, useAttrs } from "vue";
import { cn } from "@ecoma-io/loom-core";

const props = withDefaults(
  defineProps<{
    /** Width of the resizable panel in pixels. `v-model:modelValue`. */
    modelValue: number;
    /** Smallest width the panel may take. Default: `160`. */
    min?: number;
    /** Largest width the panel may take. Default: `1080`. */
    max?: number;
    /** Arrow-key increment in pixels. Default: `10`. */
    step?: number;
    /** Which side the resizable panel sits on. Default: `"left"`. */
    side?: "left" | "right";
    /** Width to restore on double-click, in pixels. Default: `320`. */
    defaultWidth?: number;
    /** Accessible name for the separator. Default: `"Resize panels"`. */
    ariaLabel?: string;
  }>(),
  {
    min: 160,
    max: 1080,
    step: 10,
    side: "left",
    defaultWidth: 320,
    ariaLabel: "Resize panels",
  },
);

const emit = defineEmits<{
  /** The live panel width; fires on every keyboard step, drag move and reset. */
  "update:modelValue": [width: number];
  /** The committed end of a resize gesture — pointer release or a keyboard step. */
  resize: [width: number];
}>();

const attrs = useAttrs();

const clamp = (value: number): number => Math.min(Math.max(value, props.min), props.max);
const width = computed(() => clamp(props.modelValue));

/** The one write path: every input (key, reset, drag end) goes through here. */
function setWidth(next: number): void {
  const value = clamp(next);
  emit("update:modelValue", value);
  emit("resize", value);
}

// --- Pointer drag -----------------------------------------------------------

const root = ref<HTMLElement | null>(null);
const separator = ref<HTMLElement | null>(null);
const dragging = ref(false);
let startPointerX = 0;
let startWidth = 0;
let dragCeiling = 0;

function onPointerDown(event: PointerEvent): void {
  if (event.button !== 0 || !root.value || !separator.value) return;
  event.preventDefault();
  dragging.value = true;
  startPointerX = event.clientX;
  startWidth = width.value;
  // The end panel keeps at least 80px, so a drag cannot push it off the row;
  // the declared `max` is looser than the container, which is the ceiling here.
  dragCeiling = Math.min(props.max, root.value.getBoundingClientRect().width - 80);
  separator.value.setPointerCapture?.(event.pointerId);
}

function onPointerMove(event: PointerEvent): void {
  if (!dragging.value) return;
  const dx = event.clientX - startPointerX;
  const delta = props.side === "left" ? dx : -dx;
  // Live during the gesture: the host's `v-model` round-trip keeps the DOM in
  // step. Clamped to the ceiling above, so the separator never leaves the row.
  emit("update:modelValue", clamp(Math.min(startWidth + delta, dragCeiling)));
}

function onPointerUp(event: PointerEvent): void {
  if (!dragging.value) return;
  dragging.value = false;
  separator.value?.releasePointerCapture?.(event.pointerId);
  emit("resize", width.value);
}

// --- Keyboard: the ARIA separator pattern -----------------------------------

function stepForKey(key: string): number | null {
  switch (key) {
    case "ArrowLeft":
      return width.value - props.step;
    case "ArrowRight":
      return width.value + props.step;
    case "Home":
      return props.min;
    case "End":
      return props.max;
    default:
      return null;
  }
}

function onKeydown(event: KeyboardEvent): void {
  const next = stepForKey(event.key);
  if (next === null) return;
  event.preventDefault();
  setWidth(next);
}

function onDoubleClick(): void {
  setWidth(props.defaultWidth);
}
</script>

<template>
  <div
    ref="root"
    :class="cn('flex h-full min-w-0', attrs.class as string)"
    data-loom-resizable-split
  >
    <!-- Handle is rendered twice so the DOM order is the visual order: the
         resizable panel first and the separator at its edge for side="left",
         mirrored for side="right". -->
    <template v-if="side === 'left'">
      <div :style="{ width: `${width}px`, flex: '0 0 auto' }" class="min-w-0 overflow-hidden">
        <slot name="panel" />
      </div>
      <!-- The separator is the keyboard surface: role, tabindex and the arrow
           keys make it an interactive element, not a painted rule. Its width is
           24px — the WCAG 2.5.8 target floor the page sweep enforces — while
           the visible rule stays a 1px line centred inside it; narrowing the
           hit area back toward the line's width fails the sweep. -->
      <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -->
      <div
        ref="separator"
        role="separator"
        tabindex="0"
        aria-orientation="vertical"
        :aria-valuenow="width"
        :aria-valuemin="props.min"
        :aria-valuemax="props.max"
        :aria-label="ariaLabel"
        :data-dragging="dragging || undefined"
        class="group relative z-10 flex w-6 cursor-col-resize touch-none select-none items-center justify-center outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @keydown="onKeydown"
        @dblclick="onDoubleClick"
        @dragstart.prevent
      >
        <div
          class="h-full w-px bg-border transition-colors group-hover:bg-primary group-focus-visible:bg-primary group-data-[dragging]:bg-primary"
        />
      </div>
      <div class="min-w-0 flex-1 overflow-hidden">
        <slot name="content" />
      </div>
    </template>
    <template v-else>
      <div class="min-w-0 flex-1 overflow-hidden">
        <slot name="content" />
      </div>
      <!-- The separator is the keyboard surface: role, tabindex and the arrow
           keys make it an interactive element, not a painted rule. -->
      <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -->
      <div
        ref="separator"
        role="separator"
        tabindex="0"
        aria-orientation="vertical"
        :aria-valuenow="width"
        :aria-valuemin="props.min"
        :aria-valuemax="props.max"
        :aria-label="ariaLabel"
        :data-dragging="dragging || undefined"
        class="group relative z-10 flex w-6 cursor-col-resize touch-none select-none items-center justify-center outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @keydown="onKeydown"
        @dblclick="onDoubleClick"
        @dragstart.prevent
      >
        <div
          class="h-full w-px bg-border transition-colors group-hover:bg-primary group-focus-visible:bg-primary group-data-[dragging]:bg-primary"
        />
      </div>
      <div :style="{ width: `${width}px`, flex: '0 0 auto' }" class="min-w-0 overflow-hidden">
        <slot name="panel" />
      </div>
    </template>
  </div>
</template>
