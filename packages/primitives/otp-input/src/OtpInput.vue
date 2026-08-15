<script lang="ts">
import type { LabelOf } from "@ecoma-io/loom-labels";

/**
 * What a cell accepts, and what keyboard a phone raises for it. `numeric` is
 * digits only; `text` takes any character, for an alphanumeric backup code.
 */
export type OtpInputType = "numeric" | "text";

/**
 * The one name this control publishes, and it replaces one Reka writes in
 * English of its own accord: `PinInputInput` labels every cell
 * `` `pin input ${index + 1} of ${length}` `` and exposes no prop for it.
 *
 * **One key, not "Digit" plus "Character" plus a joiner plus a position.** The
 * noun and the two numbers arrive together in one argument object, and the
 * variant — whether this row takes digits or any character — arrives with
 * them, because which word a language uses for a cell and where the position
 * sits relative to it are one decision rather than two. Four fragment keys
 * Loom then joined would be a sentence no translator could reorder.
 *
 * `index` is 1-based: it is a position a person is being read, not an offset
 * into an array, and handing over the 0-based one would make every override
 * write `index + 1` before it could say anything.
 */
export interface OtpInputLabels {
  /** One cell, named for what it takes and where it sits in the row. */
  readonly cell: LabelOf<{ index: number; length: number; type: OtpInputType }>;
}

/**
 * Loom's English, co-located with the component so it tree-shakes with it, and
 * exported so a host can build a partial vocabulary against the real thing.
 */
export const OTP_INPUT_LABELS: OtpInputLabels = {
  cell: ({ index, length, type }) =>
    `${type === "numeric" ? "Digit" : "Character"} ${String(index)} of ${String(length)}`,
};
</script>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { PinInputInput, PinInputRoot } from "reka-ui";
import { cn } from "@ecoma-io/loom-core";
import { useSplitAttrs } from "@ecoma-io/loom-core";
import { useFieldControl } from "@ecoma-io/loom-labels";
import { useLabels, type LabelOverrides } from "@ecoma-io/loom-labels";
import { optional } from "@ecoma-io/loom-core";

/**
 * OtpInput — the row of single-character cells a one-time code or a short PIN
 * is typed into. Reach for it when the value really is a fixed-length code
 * that arrives out of band: the cells are what let `autocomplete="one-time-code"`
 * offer the code the phone has just received, and `inputmode="numeric"` is what
 * raises the digit keypad rather than the alphabet. Both are the reason this
 * exists at all rather than a TextField with a `maxlength` — and both are also
 * why anything a reader would want to read back, correct in the middle, or
 * paste in parts belongs in a TextField instead.
 *
 * Built on Reka UI's PinInput, which supplies the per-cell behaviour: typing
 * advances to the next cell, arrow keys move between them, Backspace on an
 * empty cell steps back and clears the one before it, and a pasted code is
 * distributed across the whole row rather than crammed into one cell.
 *
 * Two things are decided here that Reka leaves open.
 *
 * **The value is a scalar `string`.** Reka models it as an array of cells;
 * this exposes `"1234"`, exactly as Slider exposes a scalar where Reka models
 * an array — a code is what a host posts to an API and compares against, and
 * neither of those wants a six-element array. In numeric mode Reka's array is
 * even an array of *numbers*, which loses a leading zero the moment anyone
 * treats it as one value. The consequence is in `onUpdate`.
 *
 * **The row is one control, not `length` of them.** Reka names each cell and
 * leaves each one tabbable, which is how this control usually fails: six
 * inputs each announcing themselves in full, and six Tab presses to step over
 * a field a sighted user reads as one. The name of the thing being typed is
 * moved onto a labelled `role="group"` so it is announced once on entering the
 * row, each cell is left with its position alone, and a roving tabindex makes
 * the row a single Tab stop.
 *
 * Inside a [Field](../Field/Field.vue) it wires itself through
 * `useFieldControl()`, and this control is the one where the resolved values
 * do not all land on the same node. The id of the row's hint or error line
 * describes the whole code and goes on the group; `required` and `invalid` are
 * states of the boxes being typed into and go on the cells, where the roles
 * that support them are — `role="group"` supports neither. The row's id and
 * the name the code is submitted under both go to Reka's hidden input: `id` is
 * a declared prop of its root rather than a fallthrough attr, and that input is
 * the better target anyway, since `<label for>` associates only with a
 * labelable element and hands focus to the first cell from there.
 *
 * What a Field still cannot do here is *name* the row: its `<label>` reaches
 * the hidden input, which is `aria-hidden`, so no accessible name is computed
 * from it. Give the name with `ariaLabel` or `ariaLabelledby` as you would
 * outside a row.
 *
 * A row's `readonly` is deliberately ignored. There is nothing to read in an
 * uneditable code box that a line of text would not show better, and the cells
 * exist to be typed into. So the library's three resting appearances collapse
 * to two here: a cell goes straight from `background` to the disabled row's
 * drained fill, muted character and slackened rim, and the lifted `subtle` fill
 * that marks a value on show never appears on this control.
 */
const props = withDefaults(
  defineProps<{
    /** The code entered so far. Shorter than `length` while it is incomplete. */
    modelValue?: string;
    /** How many cells the code is typed into. */
    length?: number;
    /** What a cell accepts: digits only, or any character. */
    type?: OtpInputType;
    /** Renders every filled cell as a dot instead of its character, for a PIN typed in public. */
    mask?: boolean;
    /** Unavailable: dims the row and refuses every cell. Unset defers to a wrapping Field. */
    disabled?: boolean | undefined;
    /** Error state: paints the destructive border and ring, and sets `aria-invalid` on every cell. Unset defers to a wrapping Field's `error`. */
    invalid?: boolean | undefined;
    /** The accessible name of the whole row, when no visible element already labels it. */
    ariaLabel?: string;
    /** The id of the visible element that labels the row — a heading, or a field's own label. */
    ariaLabelledby?: string;
    /**
     * The name each cell gives itself, as any subset of `OtpInputLabels` — the
     * rest stay as the host's `provideLoomLabels` vocabulary left them, and
     * then as Loom's English.
     *
     * This is the per-instance correction, not the place to localise an
     * application: the case it exists for is a row whose cells are neither
     * digits nor characters in the reader's terms — the groups of a licence
     * key, say — where the noun has to say so however well the application is
     * translated.
     */
    labels?: LabelOverrides<OtpInputLabels>;
  }>(),
  {
    length: 6,
    type: "numeric",
    mask: false,
    // Not `false`, for either. `false` is a caller saying "this row is fine /
    // enabled even though the field around it is not"; absent is a caller
    // saying nothing, and only `undefined` survives to mean that past Vue's
    // absent-Boolean-casts-to-false rule — see TextField.vue, which carries
    // the full reasoning.
    disabled: undefined,
    invalid: undefined,
  },
);

const emit = defineEmits<{
  /** The code so far, as one string. Fires on every cell that fills or clears. */
  "update:modelValue": [value: string];
  /** The finished code. Fires once, as the last empty cell takes its character. */
  complete: [value: string];
}>();

// `text`, not `labels`: the prop of that name is one of the three sources this
// resolves, and a template reading the raw prop would be reading the overrides
// rather than the answer.
const text = useLabels("otpInput", OTP_INPUT_LABELS, () => props.labels);

// Every fallthrough attribute lands on the group: an `aria-describedby`
// pointing at an error line, a `data-testid`, an `id` — each describes the
// control as a whole, and copying one onto `length` inputs would have a screen
// reader repeat it on every cell. `class` is pulled out of that spread only so
// it can go through `cn()`, which is what lets a caller's utility beat the
// row's own instead of losing to whichever Tailwind emitted last.
defineOptions({ inheritAttrs: false });
const { attrs, rest: groupAttrs } = useSplitAttrs();

// `id` and `aria-describedby` reach this control as fallthrough attrs rather
// than props, so they are read off `attrs` and handed in as this caller's own
// values — a caller who sets either still beats the row, and the row's
// description is merged into theirs rather than replacing it. `name`,
// `readonly` and `required` are absent from this object because there is no
// prop to oppose the row with; the row's answer stands unopposed, which is
// what is wanted.
const field = useFieldControl(() => ({
  id: attrs.id as string | undefined,
  describedBy: attrs["aria-describedby"] as string | undefined,
  ariaLabelledby: props.ariaLabelledby,
  disabled: props.disabled,
  invalid: props.invalid,
}));

// Three of the resolved keys do not travel with the bag, because the bag lands
// on the group and the group is the wrong node for all three.
//
// `name` would be a `name` on a `<div>`, which no form reads; Reka's own
// hidden input carries the joined code, so the row's name is given to the root
// as a prop instead.
//
// `aria-required` and `aria-invalid` are states of the boxes a reader types
// into, and `role="group"` supports neither — `aria-invalid` is a global so it
// would at least be legal there, `aria-required` is not and would fail
// `aria-allowed-attr`. Both are bound per cell below, off the same resolved
// values, so the row's error reaches the element a screen reader is actually
// sitting on.
//
// `id` stays in the bag and still does not land here: it is a declared prop of
// Reka's root, so it is taken as a prop rather than falling through, and Reka
// puts it on that same hidden input — which is the labelable node a
// `<label for>` needs, and the one that hands focus to the first cell.
const groupFieldAttrs = computed(() => {
  // Removed from a copy rather than listed positively, so a key added to the
  // resolved bag later reaches this group without anyone remembering to come
  // back here.
  const group: Record<string, unknown> = { ...field.attrs };
  delete group.name;
  delete group["aria-required"];
  delete group["aria-invalid"];
  return group;
});

// The single source of truth for the code we know about: seeded from the prop,
// then advanced on every update Reka reports. Feeding this back into Reka
// rather than `props.modelValue` is what keeps the row usable for a host that
// binds no `modelValue` at all — the same buffer Slider keeps, for the same
// reason. An absent prop leaves it empty rather than sticking the row on one
// value, so nothing here needs `optional()`.
const code = ref(props.modelValue ?? "");
watch(
  () => props.modelValue,
  (value) => {
    if (value !== undefined) code.value = value;
  },
);

// Longer than the row is the host's mistake to make, not ours to render: the
// extra characters have no cell to live in.
const cells = computed(() => code.value.slice(0, props.length).split(""));

// Reka calls the digits-only mode "number". The prop says "numeric" because
// nothing about the value is a number — a code with a leading zero is a
// string, and this control never parses one.
const pinType = computed(() => (props.type === "numeric" ? "number" : "text"));

// The row is one Tab stop. The stop is the first empty cell, which is also
// where Reka's own `otp` handling redirects focus, or the last cell once the
// code is full — so Tab lands where the next character goes.
const tabStopIndex = computed(() => Math.min(code.value.length, props.length - 1));

// Typed wider than the declared emit on purpose: in numeric mode the array
// really does come back holding numbers, and a cleared middle cell comes back
// as a hole. Both are why a scalar is the exposed shape.
function onUpdate(next: (string | number)[]) {
  // `join` is where the scalar is decided, and it closes gaps: Reka can hold a
  // cleared middle cell as a hole, a string cannot, so the cells after it
  // shift left. That is the only reading that keeps the model and the row
  // agreeing on one value — and it is what a single text input does when a
  // character in the middle is deleted.
  const value = next.join("");
  // Reka reports the whole row on every write, including a write that changed
  // nothing a string can see — pasting the same code over itself is the
  // reachable one. Stopping here keeps one changed code to one emitted value,
  // and one filled code to one `complete`.
  if (value === code.value) return;
  code.value = value;
  emit("update:modelValue", value);
  // Derived here rather than forwarded from Reka's own `complete`, which fires
  // from a deep watcher on its model — and that model is set twice for one
  // keystroke once the row is controlled, once by Reka and once by the value
  // coming back around. Forwarding it would announce one filled code twice.
  if (value.length === props.length) emit("complete", value);
}
</script>

<template>
  <PinInputRoot
    v-bind="{ ...groupAttrs, ...groupFieldAttrs, ...optional({ name: field.name }) }"
    :model-value="cells"
    :type="pinType"
    :mask="mask"
    :disabled="field.disabled"
    otp
    role="group"
    :aria-label="ariaLabelledby ? undefined : ariaLabel"
    :aria-labelledby="ariaLabelledby || (!ariaLabel ? field.labelledBy : undefined)"
    :data-invalid="field.invalid || undefined"
    :class="cn('inline-flex items-center gap-2', attrs.class as string)"
    @update:model-value="onUpdate"
  >
    <!-- The `:aria-label` replaces the one Reka writes inside its own render
         function — "pin input 3 of 6", the field's whole purpose restated once
         per cell. It reaches the DOM node as a fallthrough attribute, which Vue
         merges last, so it is a replacement rather than a second name. Removing
         it does not fall back to nothing; it falls back to Reka's English. The
         group carries the purpose, and a cell carries only where it sits. -->
    <PinInputInput
      v-for="cell in length"
      :key="cell"
      :index="cell - 1"
      :tabindex="cell - 1 === tabStopIndex ? 0 : -1"
      :aria-label="text.cell({ index: cell, length, type })"
      :aria-required="field.required || undefined"
      :aria-invalid="field.invalid || undefined"
      :data-filled="cell <= code.length || undefined"
      :class="
        cn(
          // Square, on the control scale's tallest step: a code cell is a
          // touch target before it is a form row, and 44px is the size a thumb
          // is aimed at. `tabular` keeps the six glyphs on one width so the
          // row does not breathe as it fills.
          'tabular h-11 w-11 rounded-md border border-input bg-background text-center text-base text-foreground',
          'transition-[color,background-color,border-color,box-shadow] duration-fast ease-out',
          // Rim-lit at rest; the ring blooms on the cell being typed into.
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          !field.invalid && 'focus-visible:shadow-halo',
          // A filled cell is legible as filled from its character — or its
          // mask dot — alone. The heavier border is a second, redundant cue,
          // and a weight rather than a hue, so it survives both a colour
          // deficiency and forced-colors.
          //
          // Withheld from an unavailable row, and only because the border is
          // also the third channel of the disabled state below: two rules
          // moving the same rim in opposite directions would leave a
          // half-filled disabled row with a heavier edge than an empty one,
          // which reads as the more available of the two. The cue is redundant
          // by construction, so the state wins it.
          !field.disabled && 'data-[filled]:border-border-strong',
          // Unavailable is a *colour* and a *weight*, never an opacity. A cell
          // holds one character — or one mask dot — and that is the entire
          // content of the control, so `opacity-50` here did not dim a code so
          // much as erase it: `--color-foreground` measures 14.09:1 on the
          // resting fill and 2.99:1 once composited at half alpha. The drained
          // fill carries the state instead, the character stays at a measured
          // 4.68:1, and the rim slackens from `input` to `border` so the state
          // is not told in hue alone.
          //
          // The fill and the text colour are `disabled:` variants rather than
          // plain classes, so each outranks the resting `bg-background
          // text-foreground` above on specificity rather than on where Tailwind
          // happened to emit it. The border cannot join them: a `disabled:`
          // variant would outrank the plain `border-destructive` below, and a
          // row that is both in error and unavailable has to keep saying so.
          'disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground',
          field.disabled && 'border-border',
          field.invalid && 'border-destructive focus-visible:outline-destructive',
        )
      "
    />
  </PinInputRoot>
</template>
