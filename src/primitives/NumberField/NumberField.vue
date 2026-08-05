<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import {
  NumberFieldRoot,
  NumberFieldInput,
  NumberFieldIncrement,
  NumberFieldDecrement,
} from "reka-ui";
import { ChevronUp, ChevronDown } from "@lucide/vue";
import { cn } from "../../lib/cn";
import { useSplitAttrs } from "../../lib/attrs";
import { optional } from "../../lib/props";

/**
 * NumberField — a constrained number input you can also *scrub*: drag
 * horizontally anywhere on the field and the value runs with the pointer, the
 * gesture professional editors trained everyone to expect on a numeric row.
 *
 * Built on Reka UI's NumberField, which supplies the spinbutton semantics and
 * the typed-value parsing. Two things are added here because Reka has no
 * equivalent: the scrub-drag gesture, and a Shift multiplier on the arrow
 * keys.
 *
 * The event contract is what makes it usable behind an undo stack.
 * `update:modelValue` is transient — it fires on every drag tick, every arrow
 * tick and every applied edit, so a host can paint a live preview. `commit`
 * fires once per gesture boundary — drag release, Enter, or focus leaving the
 * field. One long drag is therefore one undo checkpoint rather than one per
 * pixel, and a gesture that ends where it started produces none at all.
 */
const props = withDefaults(
  defineProps<{
    /** The current value. Transient edits are reported before it changes. */
    modelValue?: number;
    /** Lower bound. Every path — typing, arrows, scrub — is clamped to it. */
    min?: number;
    /** Upper bound, clamped the same way. It wins over step alignment. */
    max?: number;
    /** The granularity of one arrow tick or one scrub step. Shift multiplies it by ten. */
    step?: number;
    /** A presentational suffix such as `px` or `deg`. It is never part of the value. */
    unit?: string;
    /** Unavailable: dims the field and refuses every edit path. */
    disabled?: boolean;
    /** Error state: paints the destructive border and ring, and sets `aria-invalid`. */
    invalid?: boolean;
  }>(),
  { step: 1, disabled: false, invalid: false },
);

const emit = defineEmits<{
  /** Transient: every drag tick, arrow tick, or applied edit. Not a checkpoint. */
  "update:modelValue": [value: number];
  /** Committed: once per gesture boundary — drag release, Enter, or focus leaving. */
  commit: [value: number];
}>();

// The rendered root is a non-focusable `role="group"` wrapper, so fallthrough
// attributes that describe the *control* — `aria-labelledby`, `data-testid` —
// belong on the spinbutton inside it, not on the group. `class` is the one
// exception and goes the other way: a caller's sizing or layout class has to
// land on the element that participates in the parent's layout, merged through
// `cn()` so a caller's `w-24` actually beats the root's own `w-full` instead of
// losing to whichever utility Tailwind happened to emit last.
defineOptions({ inheritAttrs: false });
const { attrs, rest: inputAttrs } = useSplitAttrs();

// `optional()` drops the absent bounds rather than forwarding `undefined`,
// which Reka would read as "a bound that is undefined" rather than "no bound".
const rootBounds = computed(() =>
  optional({ modelValue: lastValue.value, min: props.min, max: props.max }),
);

function clampValue(value: number): number {
  const step = props.step || 1;
  const stepped = Math.round(value / step) * step;
  const withMin = props.min !== undefined ? Math.max(props.min, stepped) : stepped;
  return props.max !== undefined ? Math.min(props.max, withMin) : withMin;
}

// The single source of truth for "the last value we know about", updated the
// moment it changes — never re-derived from `props.modelValue` at commit time,
// because that prop only reflects a new value after the host's v-model
// round-trip re-renders us, which is a tick later than the blur or keydown
// being handled.
//
// It is also what the Reka root binds as its own `model-value`, rather than
// `props.modelValue`. Given a defined model value Reka runs fully controlled:
// its increment reads back through that prop, so a host that correctly
// withholds transient echoes until commit would freeze every arrow tick at
// start + 1 and freeze the readout at the gesture's start value. Feeding it
// `lastValue` keeps the ticks accumulating and the readout live inside a
// gesture, while the host still sees nothing but transient emits until the
// boundary.
const lastValue = ref(props.modelValue);

// The value the host last acknowledged. `commit` only fires when `lastValue`
// differs from it, so overlapping boundaries (Enter then blur, drag release
// then blur) and no-edit focus passes (Tab in, Tab out) produce no extra
// checkpoints.
const lastCommittedValue = ref(props.modelValue);

// True while an uncommitted edit is in flight. An external prop change
// re-baselines `lastCommittedValue` only when nothing is pending — otherwise
// the host echoing our own transient emits back down would make the pending
// edit look already committed and swallow its `commit`.
let editPending = false;

watch(
  () => props.modelValue,
  (value) => {
    lastValue.value = value;
    if (!editPending) lastCommittedValue.value = value;
  },
);

function onUpdate(value: number | undefined) {
  // Reka clears its model to `undefined` when the text in the field does not
  // parse — an emptied field, most reachably. The contract here is a number,
  // so the field falls back to its own floor instead of forwarding a hole,
  // which is also what Reka itself does when a stepper is pressed on
  // unparseable text.
  const next = value ?? props.min ?? 0;
  editPending = true;
  lastValue.value = next;
  emit("update:modelValue", next);
}

function commitLastValue() {
  // The boundary ends the edit session even when the value ended up back where
  // it started — a drag that returned to its origin still ends the gesture.
  editPending = false;
  if (lastValue.value === lastCommittedValue.value) return;
  lastCommittedValue.value = lastValue.value;
  emit("commit", lastValue.value ?? props.min ?? 0);
}

// Shift = ×10. Reka's own arrow handling is bound on the input and ignores
// `shiftKey`, so this intercepts in the capture phase — strictly before the
// event reaches the input — and fully replaces the default ×1 tick for this
// one case. Letting both run would double-step.
function onKeydownCapture(event: KeyboardEvent) {
  if (props.disabled) return;
  if (!event.shiftKey || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
  event.preventDefault();
  event.stopPropagation();
  const tick = (props.step || 1) * 10;
  const current = lastValue.value ?? props.min ?? 0;
  onUpdate(clampValue(event.key === "ArrowUp" ? current + tick : current - tick));
}

// Bubble phase, not capture: by the time this fires, the input's own Enter
// handling has already applied the typed text, because bubbling visits the
// target before its ancestors.
function onKeydownCommit(event: KeyboardEvent) {
  if (event.key !== "Enter") return;
  commitLastValue();
}

// A held arrow key is one gesture, exactly like a pointer drag: every keydown,
// including the operating system's auto-repeats, only ticks the transient
// value, and the keyup ends the gesture and commits the summed delta once. A
// single tap is a keydown plus a keyup, so it still commits once.
function onKeyupCommit(event: KeyboardEvent) {
  if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
  commitLastValue();
}

// `focusout` bubbles where `blur` does not, so this reliably runs after the
// input's own blur handling — but it only commits once focus has actually left
// the field, not when it shifts internally to the hover-revealed stepper.
function onFocusOut(event: FocusEvent) {
  const root = event.currentTarget as HTMLElement;
  if (event.relatedTarget instanceof Node && root.contains(event.relatedTarget)) return;
  commitLastValue();
}

// Horizontal scrub. A plain click must still place the caret for typing, so
// the gesture does not take over until the pointer has moved past a small
// threshold.
const DRAG_THRESHOLD_PX = 3;
const PIXELS_PER_STEP = 4;

// Set while a drag's window listeners are attached, so unmounting mid-drag
// detaches them instead of leaking handlers onto `window`.
let removeDragListeners: (() => void) | undefined;
onUnmounted(() => removeDragListeners?.());

function onPointerDown(event: PointerEvent) {
  if (props.disabled || event.button !== 0) return;
  const startX = event.clientX;
  const startValue = lastValue.value ?? props.min ?? 0;
  const step = props.step || 1;
  let dragging = false;

  function onPointerMove(moveEvent: PointerEvent) {
    const deltaX = moveEvent.clientX - startX;
    if (!dragging) {
      if (Math.abs(deltaX) < DRAG_THRESHOLD_PX) return;
      dragging = true;
      window.getSelection()?.removeAllRanges();
    }
    moveEvent.preventDefault();
    const deltaSteps = Math.round(deltaX / PIXELS_PER_STEP);
    const next = clampValue(startValue + deltaSteps * step);
    if (next !== lastValue.value) onUpdate(next);
  }

  function onPointerUp() {
    removeDragListeners?.();
    if (dragging) commitLastValue();
  }

  // Bail-out (Escape mid-scrub, or a browser-issued pointercancel): the
  // gesture is discarded. Nothing commits, and one last transient update
  // carrying the start value lets the host restore the pre-drag preview.
  function abortDrag() {
    removeDragListeners?.();
    if (!dragging) return;
    if (lastValue.value !== startValue) onUpdate(startValue);
    editPending = false;
  }

  function onDragKeydown(keyEvent: KeyboardEvent) {
    if (keyEvent.key !== "Escape" || !dragging) return;
    keyEvent.preventDefault();
    keyEvent.stopPropagation();
    abortDrag();
  }

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", abortDrag);
  window.addEventListener("keydown", onDragKeydown, true);
  removeDragListeners = () => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", abortDrag);
    window.removeEventListener("keydown", onDragKeydown, true);
    removeDragListeners = undefined;
  };
}
</script>

<template>
  <NumberFieldRoot
    v-bind="rootBounds"
    :step="step"
    :disabled="disabled"
    :aria-disabled="disabled || undefined"
    :data-invalid="invalid || undefined"
    :class="
      cn(
        'group relative inline-flex h-9 w-full items-center rounded-md border border-input bg-background',
        'transition-[color,background-color,box-shadow] duration-fast ease-out',
        // Rim-lit at rest; the ring blooms on focus.
        'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring',
        !invalid && 'focus-within:shadow-halo',
        invalid && 'border-destructive focus-within:outline-destructive',
        'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
        attrs.class as string,
      )
    "
    @update:model-value="onUpdate"
    @keydown.capture="onKeydownCapture"
    @keydown="onKeydownCommit"
    @keyup="onKeyupCommit"
    @focusout="onFocusOut"
    @pointerdown="onPointerDown"
  >
    <NumberFieldInput
      v-bind="inputAttrs"
      :aria-invalid="invalid || undefined"
      :class="
        cn(
          'tabular h-full w-full flex-1 rounded-md bg-transparent px-3 text-sm text-foreground outline-none',
          unit ? 'pr-9' : 'pr-3',
          disabled ? 'cursor-not-allowed' : 'cursor-ew-resize',
        )
      "
    />
    <!-- The unit is presentation, so it is hidden from assistive technology
         and it clears out on hover to make room for the stepper. -->
    <span
      v-if="unit"
      aria-hidden="true"
      class="pointer-events-none absolute right-2 text-xs text-muted-foreground transition-opacity duration-fast group-hover:opacity-0"
    >
      {{ unit }}
    </span>
    <!-- The stepper is hidden until hover: a column of these is read as a
         column of numbers, and a permanent pair of chevrons on every row turns
         that into a column of controls. -->
    <div
      class="absolute right-1 flex flex-col opacity-0 transition-opacity duration-fast group-hover:opacity-100"
    >
      <NumberFieldIncrement
        class="flex h-4 w-4 items-center justify-center rounded-sm text-muted-foreground [transition:transform_var(--duration-fast)_var(--ease-spring),background-color_var(--duration-fast)_var(--ease-out),color_var(--duration-fast)_var(--ease-out)] hover:bg-subtle hover:text-foreground active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
      >
        <!-- Stroke lives on the 24 grid and scales with size, so the inherited
             1.5 would render 0.75 device pixels at this 12px box and all but
             disappear. 2.5 restores the optical weight. -->
        <ChevronUp class="h-3 w-3" :stroke-width="2.5" />
      </NumberFieldIncrement>
      <NumberFieldDecrement
        class="flex h-4 w-4 items-center justify-center rounded-sm text-muted-foreground [transition:transform_var(--duration-fast)_var(--ease-spring),background-color_var(--duration-fast)_var(--ease-out),color_var(--duration-fast)_var(--ease-out)] hover:bg-subtle hover:text-foreground active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
      >
        <ChevronDown class="h-3 w-3" :stroke-width="2.5" />
      </NumberFieldDecrement>
    </div>
  </NumberFieldRoot>
</template>
