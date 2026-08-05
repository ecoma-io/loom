<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { SliderRoot, SliderTrack, SliderRange, SliderThumb } from "reka-ui";
import { cn } from "../../lib/cn";
import { useSplitAttrs } from "../../lib/attrs";

/**
 * Slider — one continuous value inside a bounded range. Reach for it when the
 * range itself is the information: a volume, a ratio, a share of something
 * whole. A number that happens to be numeric but has no meaningful ceiling —
 * a coordinate, an angle — belongs in a NumberField instead.
 *
 * Built on Reka UI's Slider for the `role="slider"` semantics, the pointer
 * drag and the arrow / Home / End stepping. Single-thumb only: Reka models the
 * value as an array, and this exposes a scalar.
 *
 * Two things are added here.
 *
 * The first is the drag buffer, and without it the component silently drops
 * changes. Given a defined model value Reka runs fully controlled, and its
 * release-time "did this change?" check compares against whatever it was last
 * fed — not against what it emitted. A host that correctly withholds transient
 * values until commit therefore leaves that check reading the pre-drag value
 * for the whole gesture, so it always answers no and the commit never fires.
 * `lastValue` below feeds Reka's own transient ticks back into its model, which
 * is exactly the fix NumberField applies for the same reason. Keyboard steps
 * need no buffer: Reka updates and commits inside one synchronous call, so it
 * compares against a value that is still old either way.
 *
 * The second is the abort path. Reka has no drag cancellation of its own — it
 * handles pointerdown, move and up, and commits whenever the release value
 * differs from the one it snapshotted — so Escape or a browser-issued
 * `pointercancel` mid-drag would still write one checkpoint on release. The
 * bail-out mirrors NumberField's: reset `lastValue` to the committed value, so
 * Reka's own comparison sees no change and never commits, and swallow the
 * still-captured pointer's remaining ticks until it releases.
 */
const props = withDefaults(
  defineProps<{
    /** The current value. Transient drag positions are reported before it changes. */
    modelValue?: number;
    /** The floor of the range, and where Home lands. */
    min?: number;
    /** The ceiling of the range, and where End lands. */
    max?: number;
    /** The granularity of one arrow-key step and of the drag's own snapping. */
    step?: number;
    /** Unavailable: dims the track and refuses both the pointer and the keyboard. */
    disabled?: boolean;
  }>(),
  { min: 0, max: 1, step: 0.01, disabled: false },
);

const emit = defineEmits<{
  /** Transient: every position the thumb passes through during a drag. Not a checkpoint. */
  "update:modelValue": [value: number];
  /** Committed: once at the end of a gesture — drag release, or a keyboard step. */
  commit: [value: number];
}>();

// The root renders a real element, and it is the one a caller's `class` has to
// land on — sizing and layout (`flex-1` to grow in a toolbar) are dead weight
// on the thumb, which is a 16px absolutely-positioned circle no flex rule
// reaches. Every other fallthrough attribute goes the other way, onto the
// thumb: `aria-labelledby` describes the `role="slider"` element, not the box
// around it.
defineOptions({ inheritAttrs: false });
const { attrs, rest: thumbAttrs } = useSplitAttrs();

// What the Reka root is fed as its own model value: seeded from the prop, then
// advanced on every tick Reka emits, so its release-time check sees the drag's
// real end position rather than the frozen prop.
const lastValue = ref(props.modelValue);
watch(
  () => props.modelValue,
  (value) => {
    lastValue.value = value;
  },
);

const values = computed(() => (lastValue.value === undefined ? [] : [lastValue.value]));

function onUpdate(next: number[] | undefined) {
  const value = next?.[0];
  if (value === undefined || aborted) return;
  lastValue.value = value;
  emit("update:modelValue", value);
}

function onCommit(next: number[]) {
  if (next[0] !== undefined && !aborted) emit("commit", next[0]);
}

// The abort path. Its window listeners live for the duration of one pointer
// gesture and no longer.
let aborted = false;
let teardownDrag: (() => void) | undefined;

function resetToCommitted() {
  if (lastValue.value === props.modelValue) return;
  lastValue.value = props.modelValue;
  // One transient tick carrying the committed value, so the host can restore
  // its pre-drag preview. Still never a checkpoint.
  if (props.modelValue !== undefined) emit("update:modelValue", props.modelValue);
}

function onRootPointerDown() {
  if (props.disabled) return;
  aborted = false;
  const onDragKeydown = (keyEvent: KeyboardEvent) => {
    if (keyEvent.key !== "Escape" || aborted) return;
    keyEvent.preventDefault();
    keyEvent.stopPropagation();
    // Reka keeps the pointer captured until release, so `aborted` is what
    // stops the remaining move ticks from resurrecting the gesture.
    aborted = true;
    resetToCommitted();
  };
  const onPointerUp = () => {
    // This runs after Reka's own element-level release handling, so a
    // swallowed gesture has already settled by the time the abort re-arms.
    teardownDrag?.();
    aborted = false;
  };
  const onPointerCancel = () => {
    teardownDrag?.();
    aborted = false; // a cancelled pointer emits no further ticks
    resetToCommitted();
  };
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerCancel);
  window.addEventListener("keydown", onDragKeydown, true);
  teardownDrag = () => {
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerCancel);
    window.removeEventListener("keydown", onDragKeydown, true);
    teardownDrag = undefined;
  };
}

onBeforeUnmount(() => teardownDrag?.());
</script>

<template>
  <SliderRoot
    :model-value="values"
    :min="min"
    :max="max"
    :step="step"
    :disabled="disabled"
    :class="
      cn(
        'relative flex w-full touch-none items-center py-2 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
        attrs.class as string,
      )
    "
    @pointerdown="onRootPointerDown"
    @update:model-value="onUpdate"
    @value-commit="onCommit"
  >
    <SliderTrack class="relative h-1.5 w-full grow rounded-full bg-muted">
      <!-- The filled range is a value a person set, so it is painted flat in
           the human force's colour rather than in a gradient. -->
      <SliderRange class="absolute h-full rounded-full bg-primary" />
    </SliderTrack>
    <SliderThumb
      v-bind="thumbAttrs"
      class="block h-4 w-4 rounded-full border-2 border-primary bg-background shadow-sm transition-transform duration-fast ease-spring hover:scale-110 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:shadow-halo data-[disabled]:pointer-events-none"
    />
  </SliderRoot>
</template>
