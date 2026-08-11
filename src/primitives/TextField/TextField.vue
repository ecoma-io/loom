<script lang="ts">
export type TextFieldType = "text" | "email" | "password" | "search" | "url" | "tel";

export type TextFieldSize = "sm" | "md" | "lg";
</script>

<script setup lang="ts">
import { cn } from "../../lib/cn";
import { useSplitAttrs } from "../../lib/attrs";
import { useFieldControl } from "../../lib/field-context";

/**
 * TextField — single-line text entry (text · email · password · search · url ·
 * tel). The border, focus ring and invalid state live on the wrapper so
 * optional `#leading`/`#trailing` adornments (a search icon, a unit suffix)
 * sit *inside* the field and share its focus bloom, instead of every caller
 * re-inventing an icon-inside-input layout. For numeric entry reach for a
 * number field; for a bounded continuous value, a slider.
 *
 * Wrapping a rendered structure means the fallthrough `class` must land on
 * the wrapper (so a caller's `w-64`/`flex-1` sizes the whole field) while the
 * rest of the attrs (`id`, `name`, `data-testid`, `aria-describedby`,
 * `autocomplete`) belong on the real `<input>` — the split-attrs convention
 * shared with the other bare controls. The accessible name is a first-class
 * prop pair (`aria-label`/`aria-labelledby`, camelized by Vue) rather than a
 * loose fallthrough attr, so it is bound onto the input explicitly and shows
 * up in the props table — a bare input primitive can only be named by its
 * host.
 *
 * Inside a [Field](../Field/Field.vue) it wires itself: the row's id, the id
 * of the hint or error line, and `required` / `invalid` / `disabled` /
 * `readonly` / `name` all arrive through `useFieldControl()`, so
 * `<Field label="Email" error="…"><TextField /></Field>` needs no attributes at
 * the call site. Every prop below still wins over the row when it is set, in
 * both directions — which is why the four booleans default to `undefined`
 * rather than `false`.
 *
 * `readonly` and `disabled` are different states, not two dials on one. A
 * read-only field is a value the reader may see and copy but not change: it
 * stays a Tab stop, stays in the form's submitted data, and is filled rather
 * than dimmed. A disabled field is unavailable: no Tab stop, not submitted,
 * dimmed.
 */
const props = withDefaults(
  defineProps<{
    /** The current value. Pair with `@update:modelValue` for `v-model`. */
    modelValue?: string;
    /** The native input type — also the on-screen keyboard hint on mobile. */
    type?: TextFieldType;
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
    /** Control height. */
    size?: TextFieldSize;
    /** The accessible name, when no visible element already labels the field. */
    ariaLabel?: string;
    /** The id of the visible element that labels the field (e.g. a Field wrapper's label). */
    ariaLabelledby?: string;
  }>(),
  {
    type: "text",
    // Not `false`, for any of the four. `false` is a caller saying "this field
    // is fine / enabled / editable even though its row is not"; absent is a
    // caller saying nothing, and only `undefined` survives to mean that. The
    // explicit default is also what beats Vue's absent-Boolean-casts-to-false
    // rule — the same reason Checkbox's `modelValue` carries one.
    disabled: undefined,
    readonly: undefined,
    invalid: undefined,
    required: undefined,
    size: "md",
  },
);

defineEmits<{ "update:modelValue": [value: string] }>();

defineOptions({ inheritAttrs: false });
const { attrs, rest: inputAttrs } = useSplitAttrs();

// `id` and `aria-describedby` reach a bare control as fallthrough attrs rather
// than props, so they are read off `attrs` and handed in as this caller's own
// values — a caller who sets either still beats the row, and the row's
// description is merged into theirs rather than replacing it.
//
// `field.attrs` then spreads onto the `<input>` **after** `inputAttrs`, and
// that position is the contract: the bag has already resolved the caller's own
// values, and it drops every key that resolved to nothing, so it can only add.
// The `:aria-invalid` binding that used to sit on the input is gone with it —
// an individual attribute written after a `v-bind` wins, so keeping one would
// overwrite the resolved value with the raw prop and quietly re-break the link
// to the row.
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
  <div
    :data-disabled="field.disabled || undefined"
    :data-readonly="field.readonly || undefined"
    :data-invalid="field.invalid || undefined"
    :class="
      cn(
        'group flex items-center gap-2 rounded-md border border-input bg-background text-foreground',
        'transition-[color,background-color,border-color,box-shadow] duration-fast ease-out',
        // Rim-lit at rest, the weave blooms on focus (Signature law): the field
        // catches light instead of casting a shadow, and focus draws it tight.
        'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring',
        !field.invalid && 'focus-within:shadow-halo',
        size === 'sm' && 'h-8 px-2.5 text-xs',
        size === 'md' && 'h-9 px-3 text-sm',
        size === 'lg' && 'h-11 px-4 text-base',
        field.invalid && 'border-destructive focus-within:outline-destructive',
        // Filled rather than dimmed, and it keeps its focus ring: a read-only
        // field is a value on show, not an unavailable control, and the two
        // must not look alike. The native `readonly` attribute below carries
        // the same state to assistive tech, so nothing here rests on colour.
        field.readonly && 'bg-muted',
        field.disabled && 'cursor-not-allowed opacity-50',
        attrs.class as string,
      )
    "
  >
    <span
      v-if="$slots.leading"
      class="inline-flex shrink-0 text-muted-foreground transition-colors duration-fast ease-out group-focus-within:text-foreground"
    >
      <slot name="leading" />
    </span>
    <input
      v-bind="{ ...inputAttrs, ...field.attrs }"
      :aria-label="ariaLabel"
      :aria-labelledby="ariaLabelledby"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="field.disabled"
      :readonly="field.readonly"
      class="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <span
      v-if="$slots.trailing"
      class="inline-flex shrink-0 text-muted-foreground transition-colors duration-fast ease-out group-focus-within:text-foreground"
    >
      <slot name="trailing" />
    </span>
  </div>
</template>
