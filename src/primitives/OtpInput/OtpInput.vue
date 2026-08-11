<script lang="ts">
/**
 * What a cell accepts, and what keyboard a phone raises for it. `numeric` is
 * digits only; `text` takes any character, for an alphanumeric backup code.
 */
export type OtpInputType = "numeric" | "text";
</script>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { PinInputInput, PinInputRoot } from "reka-ui";
import { cn } from "../../lib/cn";
import { useSplitAttrs } from "../../lib/attrs";

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
    /** Unavailable: dims the row and refuses every cell. */
    disabled?: boolean;
    /** Error state: paints the destructive border and ring, and sets `aria-invalid` on every cell. */
    invalid?: boolean;
    /** The accessible name of the whole row, when no visible element already labels it. */
    ariaLabel?: string;
    /** The id of the visible element that labels the row — a heading, or a field's own label. */
    ariaLabelledby?: string;
  }>(),
  { length: 6, type: "numeric", mask: false, disabled: false, invalid: false },
);

const emit = defineEmits<{
  /** The code so far, as one string. Fires on every cell that fills or clears. */
  "update:modelValue": [value: string];
  /** The finished code. Fires once, as the last empty cell takes its character. */
  complete: [value: string];
}>();

// Every fallthrough attribute lands on the group: an `aria-describedby`
// pointing at an error line, a `data-testid`, an `id` — each describes the
// control as a whole, and copying one onto `length` inputs would have a screen
// reader repeat it on every cell. `class` is pulled out of that spread only so
// it can go through `cn()`, which is what lets a caller's utility beat the
// row's own instead of losing to whichever Tailwind emitted last.
defineOptions({ inheritAttrs: false });
const { attrs, rest: groupAttrs } = useSplitAttrs();

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

// Reka names every cell "pin input 3 of 6", which is the field's whole purpose
// restated six times. The group carries the purpose; a cell carries only where
// it sits, so a reader entering the row hears the name once and then position.
function cellLabel(index: number): string {
  return `${props.type === "numeric" ? "Digit" : "Character"} ${index + 1} of ${props.length}`;
}

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
    v-bind="groupAttrs"
    :model-value="cells"
    :type="pinType"
    :mask="mask"
    :disabled="disabled"
    otp
    role="group"
    :aria-label="ariaLabel"
    :aria-labelledby="ariaLabelledby"
    :data-invalid="invalid || undefined"
    :class="cn('inline-flex items-center gap-2', attrs.class as string)"
    @update:model-value="onUpdate"
  >
    <PinInputInput
      v-for="cell in length"
      :key="cell"
      :index="cell - 1"
      :tabindex="cell - 1 === tabStopIndex ? 0 : -1"
      :aria-label="cellLabel(cell - 1)"
      :aria-invalid="invalid || undefined"
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
          !invalid && 'focus-visible:shadow-halo',
          invalid && 'border-destructive focus-visible:outline-destructive',
          // A filled cell is legible as filled from its character — or its
          // mask dot — alone. The heavier border is a second, redundant cue,
          // and a weight rather than a hue, so it survives both a colour
          // deficiency and forced-colors.
          'data-[filled]:border-border-strong',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )
      "
    />
  </PinInputRoot>
</template>
