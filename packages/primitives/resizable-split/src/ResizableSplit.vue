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
 * first with the separator at its edge — the left/top panel —
 * `side="right"` mirrors the row/column. The arrow keys act on the panel's
 * size, not the separator's screen position, so the narrowing key always
 * narrows the resizable panel. `orientation` chooses the axis: `"vertical"`
 * (default) sizes the panel by width, `"horizontal"` stacks the panels and
 * sizes it by height, with `side="left"` reading as the top panel. Under
 * `dir="rtl"` the row mirrors, so the drag flips to keep the separator
 * tracking the pointer — the keyboard map is unchanged.
 */
import { computed, ref, useAttrs } from "vue";
import { cn } from "@ecoma-io/loom-core";
import { useAncestorDisabled } from "@ecoma-io/loom-labels";

const props = withDefaults(
  defineProps<{
    /** Size of the resizable panel in pixels — a width in `"vertical"`, a height in `"horizontal"`. `v-model:modelValue`. */
    modelValue: number;
    /** Smallest size the panel may take. Default: `160`. */
    min?: number;
    /** Largest size the panel may take. Default: `1080`. */
    max?: number;
    /** Arrow-key increment in pixels. Default: `10`. */
    step?: number;
    /** Which side the resizable panel sits on. Default: `"left"` — the top panel in `"horizontal"` orientation. */
    side?: "left" | "right";
    /** Which axis the separator runs along. Default: `"vertical"`. */
    orientation?: "vertical" | "horizontal";
    /** Size to restore on double-click, in pixels. Default: `320`. */
    defaultWidth?: number;
    /** Accessible name for the separator. Default: `"Resize panels"`. */
    ariaLabel?: string;
    /** Unavailable: the separator refuses input and leaves the tab order.
     *  Unset defers to an enclosing `<fieldset disabled>`. */
    disabled?: boolean;
  }>(),
  {
    min: 160,
    max: 1080,
    step: 10,
    side: "left",
    orientation: "vertical",
    defaultWidth: 320,
    ariaLabel: "Resize panels",
    disabled: false,
  },
);

const emit = defineEmits<{
  /** The live panel size; fires on every keyboard step, drag move and reset —
   *  and once more on a cancelled drag, carrying the pre-drag size so the
   *  host can restore it. */
  "update:modelValue": [width: number];
  /** The committed end of a resize gesture — pointer release or a keyboard
   *  step. A cancelled drag never commits a `resize`. */
  resize: [width: number];
}>();

const attrs = useAttrs();

const clamp = (value: number): number => Math.min(Math.max(value, props.min), props.max);
const width = computed(() => clamp(props.modelValue));
const isHorizontal = computed(() => props.orientation === "horizontal");

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
let startPointer = 0;
let startWidth = 0;
let dragCeiling = 0;
/** Resolved once per gesture: a mid-drag `dir` change must not flip the sign
 *  under the pointer. */
let rtl = false;

// A disabled fieldset reaches this separator through the DOM, not through a
// prop: the separator is a `div role="separator"`, one of the elements a
// fieldset's `disabled` does not reach natively, so the refuser is the same
// composable the tree uses (useAncestorDisabled's docblock states the rule).
const ancestorDisabled = useAncestorDisabled(() => root.value);
const controlDisabled = computed(() => (props.disabled ?? false) || ancestorDisabled.value);

function onPointerDown(event: PointerEvent): void {
  if (controlDisabled.value) return;
  if (event.button !== 0 || !root.value || !separator.value) return;
  event.preventDefault();
  dragging.value = true;
  startPointer = isHorizontal.value ? event.clientY : event.clientX;
  startWidth = width.value;
  // The end panel keeps at least 80px, so a drag cannot push it off the row;
  // the declared `max` is looser than the container, which is the ceiling here.
  const rect = root.value.getBoundingClientRect();
  dragCeiling = Math.min(props.max, (isHorizontal.value ? rect.height : rect.width) - 80);
  rtl = getComputedStyle(root.value).direction === "rtl";
  separator.value.setPointerCapture?.(event.pointerId);
}

function onPointerMove(event: PointerEvent): void {
  if (!dragging.value) return;
  const dAxis = (isHorizontal.value ? event.clientY : event.clientX) - startPointer;
  // `side` and `dir` both mirror the row; neither mirrors the column, so
  // `side=right`, and RTL (vertical rows only), flip the delta.
  const dirSign = !isHorizontal.value && rtl ? -1 : 1;
  const sign = props.side === "left" ? dirSign : -dirSign;
  const delta = sign * dAxis;
  // Live during the gesture: the host's `v-model` round-trip keeps the DOM in
  // step. Clamped to the ceiling above, so the separator never leaves the row.
  emit("update:modelValue", clamp(Math.min(startWidth + delta, dragCeiling)));
}

function endDrag(event: PointerEvent): void {
  dragging.value = false;
  separator.value?.releasePointerCapture?.(event.pointerId);
}

function onPointerUp(event: PointerEvent): void {
  if (!dragging.value) return;
  endDrag(event);
  emit("resize", width.value);
}

function onPointerCancel(event: PointerEvent): void {
  if (!dragging.value) return;
  endDrag(event);
  // A cancelled gesture is discarded: nothing commits, and one last transient
  // update carrying the pre-drag size lets the host restore it — the same
  // cancel-no-commit convention NumberField's abortDrag applies to its scrub.
  if (width.value !== startWidth) emit("update:modelValue", startWidth);
}

// --- Keyboard: the ARIA separator pattern -----------------------------------

function stepForKey(key: string): number | null {
  const narrowing = isHorizontal.value ? "ArrowUp" : "ArrowLeft";
  const widening = isHorizontal.value ? "ArrowDown" : "ArrowRight";
  switch (key) {
    case narrowing:
      return width.value - props.step;
    case widening:
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
  if (controlDisabled.value) return;
  const next = stepForKey(event.key);
  if (next === null) return;
  event.preventDefault();
  setWidth(next);
}

function onDoubleClick(): void {
  if (controlDisabled.value) return;
  setWidth(props.defaultWidth);
}
</script>

<template>
  <div
    ref="root"
    :class="cn('flex h-full min-w-0', isHorizontal && 'flex-col', attrs.class as string)"
    data-loom-resizable-split
  >
    <!-- Handle is rendered twice so the DOM order is the visual order: the
         resizable panel first and the separator at its edge for side="left",
         mirrored for side="right". In horizontal orientation, the row is a
         column: side="left" reads as the top panel, side="right" the bottom. -->
    <template v-if="side === 'left'">
      <div
        :style="
          isHorizontal
            ? { height: `${width}px`, flex: '0 0 auto' }
            : { width: `${width}px`, flex: '0 0 auto' }
        "
        :class="isHorizontal ? 'min-h-0 overflow-hidden' : 'min-w-0 overflow-hidden'"
      >
        <slot name="panel" />
      </div>
      <!-- The separator is the keyboard surface: role, tabindex and the arrow
           keys make it an interactive element, not a painted rule. Its
           cross-axis size is 24px — the WCAG 2.5.8 target floor the page
           sweep enforces — while the visible rule stays a 1px line centred
           inside it; narrowing the hit area back toward the line's width
           fails the sweep. -->
      <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -->
      <div
        ref="separator"
        role="separator"
        :tabindex="controlDisabled ? undefined : 0"
        :aria-orientation="props.orientation"
        :aria-valuenow="width"
        :aria-valuemin="props.min"
        :aria-valuemax="props.max"
        :aria-label="ariaLabel"
        :aria-disabled="controlDisabled || undefined"
        :data-dragging="dragging || undefined"
        :class="
          cn(
            'group relative z-10 flex touch-none select-none items-center justify-center outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
            isHorizontal ? 'h-6 w-full cursor-row-resize' : 'w-6 cursor-col-resize',
          )
        "
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerCancel"
        @keydown="onKeydown"
        @dblclick="onDoubleClick"
        @dragstart.prevent
      >
        <div
          :class="
            cn(
              'bg-border transition-colors group-hover:bg-primary group-focus-visible:bg-primary group-data-[dragging]:bg-primary',
              isHorizontal ? 'h-px w-full' : 'h-full w-px',
            )
          "
        />
      </div>
      <div
        :class="isHorizontal ? 'min-h-0 flex-1 overflow-hidden' : 'min-w-0 flex-1 overflow-hidden'"
      >
        <slot name="content" />
      </div>
    </template>
    <template v-else>
      <div
        :class="isHorizontal ? 'min-h-0 flex-1 overflow-hidden' : 'min-w-0 flex-1 overflow-hidden'"
      >
        <slot name="content" />
      </div>
      <!-- The separator is the keyboard surface: role, tabindex and the arrow
           keys make it an interactive element, not a painted rule. -->
      <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -->
      <div
        ref="separator"
        role="separator"
        :tabindex="controlDisabled ? undefined : 0"
        :aria-orientation="props.orientation"
        :aria-valuenow="width"
        :aria-valuemin="props.min"
        :aria-valuemax="props.max"
        :aria-label="ariaLabel"
        :aria-disabled="controlDisabled || undefined"
        :data-dragging="dragging || undefined"
        :class="
          cn(
            'group relative z-10 flex touch-none select-none items-center justify-center outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
            isHorizontal ? 'h-6 w-full cursor-row-resize' : 'w-6 cursor-col-resize',
          )
        "
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerCancel"
        @keydown="onKeydown"
        @dblclick="onDoubleClick"
        @dragstart.prevent
      >
        <div
          :class="
            cn(
              'bg-border transition-colors group-hover:bg-primary group-focus-visible:bg-primary group-data-[dragging]:bg-primary',
              isHorizontal ? 'h-px w-full' : 'h-full w-px',
            )
          "
        />
      </div>
      <div
        :style="
          isHorizontal
            ? { height: `${width}px`, flex: '0 0 auto' }
            : { width: `${width}px`, flex: '0 0 auto' }
        "
        :class="isHorizontal ? 'min-h-0 overflow-hidden' : 'min-w-0 overflow-hidden'"
      >
        <slot name="panel" />
      </div>
    </template>
  </div>
</template>
