<script lang="ts">
/**
 * Everything this control publishes to assistive technology — and all three of
 * these are names Reka UI would otherwise supply in English of its own accord.
 *
 * `increment` and `decrement` are the stepper buttons, which Reka labels
 * `Increase` and `Decrease` inside its own render function with no prop to
 * reach them by. `roleDescription` replaces the `aria-roledescription="Number
 * field"` Reka writes on the spinbutton itself — the phrase a screen reader
 * announces *in place of* "spin button", so leaving it unreachable means a
 * fully localised form still names its own control in English.
 *
 * A binding on the Loom side arrives as a fallthrough attribute, which Vue
 * merges onto the root vnode after Reka's render function produced it, and
 * `mergeProps` is last-write-wins for everything that is not `class`, `style`
 * or `on*`. So these replace Reka's rather than competing with it, and
 * `NumberField.test.ts` pins that by overriding each one and reading the DOM
 * back — the check the wording alone cannot make, since Loom's English for the
 * role description is the same phrase Reka chose.
 */
export interface NumberFieldLabels {
  /** The stepper's up button. */
  readonly increment: string;
  /** The stepper's down button. */
  readonly decrement: string;
  /**
   * What the field calls itself, announced in place of "spin button". Set it
   * to the kind of number the field holds — "Rotation, in degrees" — where
   * that is more use to a reader than the control's generic name.
   */
  readonly roleDescription: string;
}

/**
 * Loom's English, co-located with the component so it tree-shakes with it, and
 * exported so a host can build a partial vocabulary against the real thing.
 */
export const NUMBER_FIELD_LABELS: NumberFieldLabels = {
  increment: "Increase value",
  decrement: "Decrease value",
  roleDescription: "Number field",
};
</script>

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
import { useFieldControl } from "../../lib/field-context";
import { useLabels, type LabelOverrides } from "../../lib/labels";
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
 *
 * Inside a [Field](../Field/Field.vue) it wires itself: the row's id, the id of
 * its hint or error line, `required`, `invalid`, `disabled`, `readonly` and the
 * name the value is submitted under all arrive through `useFieldControl()`, so
 * `<Field label="Rotation" error="…"><NumberField … /></Field>` needs no
 * attributes at the call site. Every prop below still wins over the row when it
 * is set, in both directions — which is why the three booleans default to
 * `undefined` rather than `false`.
 *
 * `readonly` and `disabled` are different states here for the same reason they
 * are on a text input, and a number is the case that makes it obvious: a rate,
 * a computed total or a locked coordinate is a value on show. It stays a Tab
 * stop, stays in the form's submitted data, and is filled rather than dimmed —
 * and every path that would change it is closed, the stepper included, because
 * a control offering a gesture that does nothing is worse than one that offers
 * none.
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
    /** Unavailable: dims the field and refuses every edit path. Unset defers to a wrapping Field. */
    disabled?: boolean | undefined;
    /** Shows the value without allowing an edit — typing, arrows, stepper and scrub all closed — while staying focusable and still submitted. Unset defers to a wrapping Field. */
    readonly?: boolean | undefined;
    /** Error state: paints the destructive border and ring, and sets `aria-invalid`. Unset defers to a wrapping Field's `error`. */
    invalid?: boolean | undefined;
    /**
     * Names for everything this control says out loud, as any subset of
     * `NumberFieldLabels` — the rest stay as the host's `provideLoomLabels`
     * vocabulary left them, and then as Loom's English.
     *
     * This is the per-instance correction, not the place to localise an
     * application: the case it exists for is `roleDescription`, where a field
     * holding a rotation or a price is more useful named as that than as a
     * number field.
     */
    labels?: LabelOverrides<NumberFieldLabels>;
  }>(),
  {
    step: 1,
    // Not `false`, for any of the three. `false` is a caller saying "this field
    // is fine / enabled / editable even though its row is not"; absent is a
    // caller saying nothing, and only `undefined` survives to mean that past
    // Vue's absent-Boolean-casts-to-false rule — see TextField.vue, which
    // carries the full reasoning.
    disabled: undefined,
    readonly: undefined,
    invalid: undefined,
  },
);

const emit = defineEmits<{
  /** Transient: every drag tick, arrow tick, or applied edit. Not a checkpoint. */
  "update:modelValue": [value: number];
  /** Committed: once per gesture boundary — drag release, Enter, or focus leaving. */
  commit: [value: number];
}>();

// `text`, not `labels`: the prop of that name is one of the three sources this
// resolves, and a template reading the raw prop would be reading the overrides
// rather than the answer.
const text = useLabels("numberField", NUMBER_FIELD_LABELS, () => props.labels);

// The rendered root is a non-focusable `role="group"` wrapper, so fallthrough
// attributes that describe the *control* — `aria-labelledby`, `data-testid` —
// belong on the spinbutton inside it, not on the group. `class` is the one
// exception and goes the other way: a caller's sizing or layout class has to
// land on the element that participates in the parent's layout, merged through
// `cn()` so a caller's `w-24` actually beats the root's own `w-full` instead of
// losing to whichever utility Tailwind happened to emit last.
defineOptions({ inheritAttrs: false });
const { attrs, rest: inputAttrs } = useSplitAttrs();

// `id` and `aria-describedby` reach this control as fallthrough attrs rather
// than props, so they are read off `attrs` and handed in as this caller's own
// values — a caller who sets either still beats the row, and the row's
// description is merged into theirs rather than replacing it. `name` and
// `required` are absent from this object because there is no prop to oppose
// the row with; the row's answer stands unopposed, which is what is wanted.
const field = useFieldControl(() => ({
  id: attrs.id as string | undefined,
  describedBy: attrs["aria-describedby"] as string | undefined,
  disabled: props.disabled,
  readonly: props.readonly,
  invalid: props.invalid,
}));

// `name` is the one resolved key that does not travel with the bag, and here
// it is a defect rather than a nicety: the bag lands on the spinbutton, and
// what the spinbutton holds is the *formatted* number — `1,234` for 1234. A
// `name` on it would post the grouping separators along with the digits. Reka
// submits the model value itself through a hidden input it renders from the
// root's own `name`, so that is where the row's name goes. Everything else in
// the bag — the id, the merged description, `aria-required`, `aria-invalid` —
// belongs on the `role="spinbutton"` node, which is that input.
const inputFieldAttrs = computed(() => {
  // Removed from a copy rather than listed positively, so a key added to the
  // resolved bag later reaches this input without anyone remembering to come
  // back here.
  const aria: Record<string, unknown> = { ...field.attrs };
  delete aria.name;
  return aria;
});

// `optional()` drops the absent bounds and an absent name rather than
// forwarding `undefined`, which Reka would read as "a bound that is undefined"
// rather than "no bound" — and, for the name, would have it render a hidden
// form input for a field nothing is submitting.
const rootProps = computed(() =>
  optional({
    modelValue: lastValue.value,
    min: props.min,
    max: props.max,
    name: field.name,
  }),
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
  // Read-only closes this path as firmly as disabled does. Reka's own arrow
  // handling already bails on `readonly`, and this override replaces it — so
  // without the guard Shift+Arrow would be the one way to edit a field that
  // says it cannot be edited.
  if (field.disabled || field.readonly) return;
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
  // A read-only field still places the caret and still selects text, which is
  // the whole point of it — it simply never starts a scrub.
  if (field.disabled || field.readonly || event.button !== 0) return;
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
    v-bind="rootProps"
    :step="step"
    :disabled="field.disabled"
    :readonly="field.readonly"
    :aria-disabled="field.disabled || undefined"
    :data-invalid="field.invalid || undefined"
    :class="
      cn(
        'group relative inline-flex h-9 w-full items-center rounded-md border border-input bg-background',
        'transition-[color,background-color,box-shadow] duration-fast ease-out',
        // Rim-lit at rest; the ring blooms on focus.
        'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring',
        !field.invalid && 'focus-within:shadow-halo',
        field.invalid && 'border-destructive focus-within:outline-destructive',
        // Filled rather than dimmed, and it keeps its focus ring: a read-only
        // value is on show, not an unavailable control, and the two must not
        // look alike. Reka's native `readonly` on the input carries the same
        // state to assistive tech, so nothing here rests on colour.
        field.readonly && 'bg-muted',
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
    <!-- `aria-roledescription` is written before the `v-bind` rather than after
         it, which is the opposite of the field bag below and deliberate: it is
         replacing Reka's own literal, not a caller's, so a caller who passes
         the attribute directly should still beat it. Reka's is merged inside
         its render function and Vue applies everything from here afterwards,
         so both orders defeat Reka and only this one leaves the caller a way
         past Loom. -->
    <NumberFieldInput
      :aria-roledescription="text.roleDescription"
      v-bind="{ ...inputAttrs, ...inputFieldAttrs }"
      :class="
        cn(
          'tabular h-full w-full flex-1 rounded-md bg-transparent px-3 text-sm text-foreground outline-none',
          unit ? 'pr-9' : 'pr-3',
          field.disabled && 'cursor-not-allowed',
          // The scrub cursor is a promise the field makes about the gesture it
          // takes. Read-only takes no gesture, so it must not make the promise
          // — the caret cursor is the honest one for a value you may select
          // and copy but not change.
          !field.disabled && !field.readonly && 'cursor-ew-resize',
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
         that into a column of controls.

         It is not rendered at all on a read-only field. Reka's own
         `handleChangingValue` bails on `readonly` *after* focusing the input,
         so a rendered stepper would be two named buttons that a pointer or a
         screen reader can still reach and press, and that answer by moving
         focus and changing nothing. Absent is the honest state. -->
    <div
      v-if="!field.readonly"
      class="absolute right-1 flex flex-col opacity-0 transition-opacity duration-fast group-hover:opacity-100"
    >
      <!-- Both `:aria-label`s replace one Reka writes in English inside its own
           render function — "Increase" and "Decrease". They reach the DOM node
           as fallthrough attributes, which Vue merges last, so each is a
           replacement rather than a second name. Removing one does not fall
           back to nothing; it falls back to Reka's English. -->
      <NumberFieldIncrement
        :aria-label="text.increment"
        class="flex h-4 w-4 items-center justify-center rounded-sm text-muted-foreground [transition:transform_var(--duration-fast)_var(--ease-spring),background-color_var(--duration-fast)_var(--ease-out),color_var(--duration-fast)_var(--ease-out)] hover:bg-subtle hover:text-foreground active:scale-press focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
      >
        <!-- Stroke lives on the 24 grid and scales with size, so the inherited
             1.5 would render 0.75 device pixels at this 12px box and all but
             disappear. 2.5 restores the optical weight. -->
        <ChevronUp class="h-3 w-3" :stroke-width="2.5" />
      </NumberFieldIncrement>
      <NumberFieldDecrement
        :aria-label="text.decrement"
        class="flex h-4 w-4 items-center justify-center rounded-sm text-muted-foreground [transition:transform_var(--duration-fast)_var(--ease-spring),background-color_var(--duration-fast)_var(--ease-out),color_var(--duration-fast)_var(--ease-out)] hover:bg-subtle hover:text-foreground active:scale-press focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
      >
        <ChevronDown class="h-3 w-3" :stroke-width="2.5" />
      </NumberFieldDecrement>
    </div>
  </NumberFieldRoot>
</template>
