<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useTemplateRef, watch } from "vue";
import { SliderRoot, SliderTrack, SliderRange, SliderThumb } from "reka-ui";
import { cn } from "../../lib/cn";
import { useSplitAttrs } from "../../lib/attrs";
import { useAncestorDisabled } from "../../lib/ancestor-disabled";
import { useFieldControl } from "../../lib/field-context";

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
 *
 * Inside a [Field](../Field/Field.vue) it wires itself through
 * `useFieldControl()`: the row's id, the id of its hint or error line,
 * `required` and `invalid` all reach the thumb — which is the `role="slider"`
 * element, and therefore the thing the row is talking about — and the row's
 * `name` reaches a hidden input, so
 * `<Field label="Volume" error="…"><Slider /></Field>` needs no attributes at
 * the call site. `disabled` still wins wherever it is set, in both directions,
 * which is why it defaults to `undefined` rather than `false`.
 *
 * **A row's label does not name it.** `<label for>` names a labelable element
 * and the thumb is a `span[role="slider"]`, so the row's label resolves to it
 * and announces nobody. `aria-label`/`aria-labelledby` are still what name this
 * control, exactly as they were before — and they were always routed to the
 * thumb for the same reason the rest of this bag is.
 *
 * There is no `readonly`, and a row's is ignored rather than approximated. The
 * whole control is the drag: a track that shows a value and refuses to move is
 * a [Progress](../Progress/Progress.vue) bar wearing a thumb, and painting one
 * as live while swallowing every gesture is the state worse than either.
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
    /** Unavailable: dims the track and refuses both the pointer and the keyboard. Unset defers to a wrapping Field. */
    disabled?: boolean | undefined;
  }>(),
  {
    min: 0,
    max: 1,
    step: 0.01,
    // Not `false`: absent has to stay tellable from `false` for a Field above
    // to disable the row and for `:disabled="false"` to overrule one that does.
    // Vue casts an absent Boolean prop with no declared default to `false`,
    // which would leave the context wired and inert.
    disabled: undefined,
  },
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

/**
 * The one control in the library the platform cannot disable for us.
 *
 * `<fieldset disabled>` reaches `<input>`, `<button>`, `<select>` and
 * `<textarea>` and stops there, and Reka renders this thumb as a
 * `<span role="slider" tabindex="0">`. Measured in jsdom, a Slider inside a
 * disabled group kept its tab stop and still moved its value on Home and End —
 * identical behaviour to an available one. Painting it unavailable without
 * this would produce the worse defect rather than fix the visible one: a
 * control that looks unreachable and answers the keyboard anyway.
 *
 * It is read off the DOM rather than taken from the Field context because
 * `Fieldset.vue` deliberately publishes no `disabled` there — see
 * `../../lib/ancestor-disabled.ts` for why a read cannot drift from the
 * attribute the way a second declaration would.
 */
const root = useTemplateRef<{ $el?: Element }>("root");
const groupDisabled = useAncestorDisabled(() => root.value?.$el);

// `id` and `aria-describedby` reach this control as fallthrough attrs rather
// than props, so they are read off `attrs` and handed in as this caller's own
// values — a caller who sets either still beats the row, and the row's
// description is merged into theirs rather than replacing it. `name`,
// `required` and `invalid` are absent from the object because there is no prop
// to oppose the row with; the row's answer stands unopposed, which is what
// wrapping the slider in a Field asked for.
const field = useFieldControl(() => ({
  id: attrs.id as string | undefined,
  describedBy: attrs["aria-describedby"] as string | undefined,
  // The fieldset beats the prop in both directions, exactly as it does for a
  // native control: an `<input :disabled="false">` inside a disabled group is
  // disabled too, so a Slider that said the same must not be the one exception.
  disabled: groupDisabled.value ? true : props.disabled,
}));

// The resolved bag lands on the thumb for the same reason every other
// fallthrough attribute does — it is the `role="slider"` element, and an id, a
// description or an `aria-invalid` describes that, not the box around it.
//
// `name` is the one key that goes the other way: a name on a thumb submits
// nothing, so it drives the hidden input inside the root instead. Removed from
// a copy rather than listed positively, so a key added to the resolved bag
// later reaches the thumb without anyone remembering to come back here.
const thumbFieldAttrs = computed(() => {
  const aria: Record<string, unknown> = { ...field.attrs };
  delete aria.name;
  return aria;
});

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
  if (field.disabled) return;
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
    ref="root"
    :model-value="values"
    :min="min"
    :max="max"
    :step="step"
    :disabled="field.disabled"
    :class="
      cn(
        // Unavailability is painted in measured greys, never as an alpha over
        // the available state: the filled range and the thumb's rim *are* the
        // value, and `opacity-50` here took the range from 7.53:1 to 2.36:1
        // on the page ground — below WCAG 1.4.11's 3:1 floor for a graphical
        // object required to understand the control. The two parts drain to
        // their own tokens below; `aria-valuenow` announces the number, but
        // nothing re-paints it for a sighted reader, so the pixels stay.
        'relative flex w-full touch-none items-center py-2 data-[disabled]:cursor-not-allowed',
        attrs.class as string,
      )
    "
    @pointerdown="onRootPointerDown"
    @update:model-value="onUpdate"
    @value-commit="onCommit"
  >
    <!-- Reka would mint this itself from a `name` on the root, but it models
         the value as an array and posts it as `volume[0]`. This control
         exposes a scalar and a row's `name` has to post one: a field that
         spells itself differently depending on which control its row holds is
         exactly the surprise the Field context exists to remove.

         `lastValue` and not `modelValue`, so what is submitted is what the
         thumb is showing: a host that withholds transient values until commit
         leaves the prop behind for the length of a gesture. -->
    <input
      v-if="field.name !== undefined"
      type="hidden"
      :name="field.name"
      :value="lastValue"
      :disabled="field.disabled"
    />
    <SliderTrack class="relative h-1.5 w-full grow rounded-full bg-muted">
      <!-- The filled range is a value a person set, so it is painted flat in
           the human force's colour rather than in a gradient. Unavailable, it
           falls to the neutral well like every other control's value, keyed
           off Reka's own `data-disabled` on this node: `muted-foreground` is
           5.25:1 on the page ground and 4.67:1 against the `bg-muted` track
           it sits on, both measured. -->
      <SliderRange
        class="absolute h-full rounded-full bg-primary data-[disabled]:bg-muted-foreground"
      />
    </SliderTrack>
    <!-- The thumb's position is the value, so its rim drains with the range —
         `muted-foreground` at 5.25:1 on the page ground — while its fill,
         which is the page's own ground, needs no dim. -->
    <SliderThumb
      v-bind="{ ...thumbAttrs, ...thumbFieldAttrs }"
      class="block h-4 w-4 rounded-full border-2 border-primary bg-background shadow-sm transition-transform duration-fast ease-spring hover:scale-110 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:shadow-halo data-[disabled]:pointer-events-none data-[disabled]:border-muted-foreground"
    />
  </SliderRoot>
</template>
