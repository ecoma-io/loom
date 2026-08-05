<script lang="ts">
export type TextFieldType = "text" | "email" | "password" | "search" | "url" | "tel";

export type TextFieldSize = "sm" | "md" | "lg";
</script>

<script setup lang="ts">
import { cn } from "../../lib/cn";
import { useSplitAttrs } from "../../lib/attrs";

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
 */
withDefaults(
  defineProps<{
    /** The current value. Pair with `@update:modelValue` for `v-model`. */
    modelValue?: string;
    /** The native input type — also the on-screen keyboard hint on mobile. */
    type?: TextFieldType;
    /** Text shown in the empty field. */
    placeholder?: string;
    /** Disables the field and blocks pointer and keyboard input. */
    disabled?: boolean;
    /** Error state: paints the destructive border/ring and sets aria-invalid. */
    invalid?: boolean;
    /** Control height. */
    size?: TextFieldSize;
    /** The accessible name, when no visible element already labels the field. */
    ariaLabel?: string;
    /** The id of the visible element that labels the field (e.g. a Field wrapper's label). */
    ariaLabelledby?: string;
  }>(),
  {
    type: "text",
    disabled: false,
    invalid: false,
    size: "md",
  },
);

defineEmits<{ "update:modelValue": [value: string] }>();

defineOptions({ inheritAttrs: false });
const { attrs, rest: inputAttrs } = useSplitAttrs();
</script>

<template>
  <div
    :data-disabled="disabled || undefined"
    :data-invalid="invalid || undefined"
    :class="
      cn(
        'group flex items-center gap-2 rounded-md border border-input bg-background text-foreground',
        'transition-[color,background-color,border-color,box-shadow] duration-fast ease-out',
        // Rim-lit at rest, the weave blooms on focus (Signature law): the field
        // catches light instead of casting a shadow, and focus draws it tight.
        'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring',
        !invalid && 'focus-within:shadow-halo',
        size === 'sm' && 'h-8 px-2.5 text-xs',
        size === 'md' && 'h-9 px-3 text-sm',
        size === 'lg' && 'h-11 px-4 text-base',
        invalid && 'border-destructive focus-within:outline-destructive',
        disabled && 'cursor-not-allowed opacity-50',
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
      v-bind="inputAttrs"
      :aria-label="ariaLabel"
      :aria-labelledby="ariaLabelledby"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :aria-invalid="invalid || undefined"
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
