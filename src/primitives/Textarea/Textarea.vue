<script lang="ts">
export type TextareaResize = "none" | "vertical";
</script>

<script setup lang="ts">
import { cn } from "../../lib/cn";
import { useSplitAttrs } from "../../lib/attrs";
import { useFieldControl } from "../../lib/field-context";

/**
 * Textarea — multi-line text entry. A native `<textarea>`, single node (no
 * wrapper — unlike TextField there are no `#leading`/`#trailing` adornments to
 * frame), so `class` and the rest of the fallthrough attrs both target the
 * same element; still routed through `useSplitAttrs()` for the same reason as
 * every other primitive — a caller's `class` needs a Tailwind-aware `cn()`
 * merge, not a raw `v-bind` clobbering it. The accessible name is a
 * first-class prop pair (`aria-label`/`aria-labelledby`, camelized by Vue)
 * bound onto the textarea explicitly, the same contract as TextField.
 *
 * Inside a [Field](../Field/Field.vue) it wires itself through
 * `useFieldControl()` — the row's id, the id of its hint or error line, and
 * `required` / `invalid` / `disabled` / `readonly` / `name` — so
 * `<Field label="Bio" hint="…"><Textarea /></Field>` needs no attributes at the
 * call site. Every prop below still wins over the row when it is set, in both
 * directions, which is why the four booleans default to `undefined` rather
 * than `false`. `readonly` and `disabled` are different states: read-only is a
 * value on show — still a Tab stop, still submitted, filled rather than dimmed
 * — where disabled is unavailable.
 */
const props = withDefaults(
  defineProps<{
    /** The current value. Pair with `@update:modelValue` for `v-model`. */
    modelValue?: string;
    /** Text shown in the empty field. */
    placeholder?: string;
    /** Disables the field and blocks pointer and keyboard input. Unset defers to a wrapping Field. */
    disabled?: boolean | undefined;
    /** Shows the value without allowing an edit, while staying focusable and still submitted. Unset defers to a wrapping Field. */
    readonly?: boolean | undefined;
    /** Error state: paints the destructive border/ring and sets aria-invalid. Unset defers to a wrapping Field's `error`. */
    invalid?: boolean | undefined;
    /** Marks the field mandatory to assistive tech (`aria-required`). Unset defers to a wrapping Field. */
    required?: boolean | undefined;
    /** The field name for a native form post or `FormData`. Unset defers to a wrapping Field. */
    name?: string;
    /** Initial height in text rows. */
    rows?: number;
    /** Whether a person can drag-resize the field; `none` locks it to `rows`. */
    resize?: TextareaResize;
    /** The accessible name, when no visible element already labels the field. */
    ariaLabel?: string;
    /** The id of the visible element that labels the field (e.g. a Field wrapper's label). */
    ariaLabelledby?: string;
  }>(),
  {
    // Not `false`, for any of the four — see TextField.vue, which carries the
    // full reasoning. `false` is a caller's decision that must beat the row;
    // absent is a caller saying nothing, and only `undefined` survives to mean
    // that past Vue's absent-Boolean-casts-to-false rule.
    disabled: undefined,
    readonly: undefined,
    invalid: undefined,
    required: undefined,
    rows: 3,
    resize: "vertical",
  },
);

defineEmits<{ "update:modelValue": [value: string] }>();

defineOptions({ inheritAttrs: false });
const { attrs, rest: textareaAttrs } = useSplitAttrs();

// `id` and `aria-describedby` arrive as fallthrough attrs rather than props, so
// they are handed in as this caller's own values: a caller who sets either
// still beats the row, and the row's description is merged into theirs.
//
// `field.attrs` then spreads **after** `textareaAttrs`, and that position is
// the contract — see TextField.vue, which carries the full reasoning. The
// `:aria-invalid` binding that used to sit below went with it: an individual
// attribute written after a `v-bind` wins, so keeping one would overwrite the
// resolved value with the raw prop.
//
// The explanation lives here rather than above the element because a template
// comment before this component's single root would render as a second root
// node in a development build.
const field = useFieldControl(() => ({
  id: attrs.id as string | undefined,
  describedBy: attrs["aria-describedby"] as string | undefined,
  name: props.name,
  disabled: props.disabled,
  readonly: props.readonly,
  invalid: props.invalid,
  required: props.required,
}));
</script>

<template>
  <textarea
    v-bind="{ ...textareaAttrs, ...field.attrs }"
    :aria-label="ariaLabel"
    :aria-labelledby="ariaLabelledby"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="field.disabled"
    :readonly="field.readonly"
    :data-readonly="field.readonly || undefined"
    :rows="rows"
    :class="
      cn(
        'rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm',
        'transition-[color,background-color,border-color,box-shadow] duration-fast ease-out',
        // Rim-lit at rest, the weave blooms on focus (Signature law).
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        !field.invalid && 'focus-visible:shadow-halo',
        'placeholder:text-muted-foreground',
        // No `opacity`, for the reason Select's trigger carries the same rule:
        // this element *is* the text. A disabled textarea holding a filed
        // answer is still there to be read, and `disabled:opacity-50` took that
        // answer from 14.09:1 to 3.06:1 and its placeholder from 5.25:1 to
        // 2.05:1 — halving the alpha more than halves the contrast. Drained to
        // the neutral well with the label on the measured muted colour instead:
        // 4.67:1, and the same treatment Select and OtpInput already wear, so a
        // disabled form row is one colour rather than three.
        'disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground',
        field.invalid && 'border-destructive focus-visible:outline-destructive',
        // Filled rather than dimmed, and it keeps its focus ring: a read-only
        // field is a value on show, not an unavailable control, and the two
        // must not look alike. They share this fill and part on the text: a
        // read-only value stays on `text-foreground` and stays focusable, where
        // the disabled rule above mutes the text and takes the cursor with it.
        // The native `readonly` attribute carries the same state to assistive
        // tech, so nothing here rests on colour.
        field.readonly && 'bg-muted',
        resize === 'none' ? 'resize-none' : 'resize-y',
        attrs.class as string,
      )
    "
    @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
  />
</template>
