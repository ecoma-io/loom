<script lang="ts">
export type TextareaResize = "none" | "vertical";
</script>

<script setup lang="ts">
import { cn } from "../../lib/cn";
import { useSplitAttrs } from "../../lib/attrs";

/**
 * Textarea — multi-line text entry. A native `<textarea>`, single node (no
 * wrapper — unlike TextField there are no `#leading`/`#trailing` adornments to
 * frame), so `class` and the rest of the fallthrough attrs both target the
 * same element; still routed through `useSplitAttrs()` for the same reason as
 * every other primitive — a caller's `class` needs a Tailwind-aware `cn()`
 * merge, not a raw `v-bind` clobbering it. The accessible name is a
 * first-class prop pair (`aria-label`/`aria-labelledby`, camelized by Vue)
 * bound onto the textarea explicitly, the same contract as TextField.
 */
withDefaults(
  defineProps<{
    /** The current value. Pair with `@update:modelValue` for `v-model`. */
    modelValue?: string;
    /** Text shown in the empty field. */
    placeholder?: string;
    /** Disables the field and blocks pointer and keyboard input. */
    disabled?: boolean;
    /** Error state: paints the destructive border/ring and sets aria-invalid. */
    invalid?: boolean;
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
    disabled: false,
    invalid: false,
    rows: 3,
    resize: "vertical",
  },
);

defineEmits<{ "update:modelValue": [value: string] }>();

defineOptions({ inheritAttrs: false });
const { attrs, rest: textareaAttrs } = useSplitAttrs();
</script>

<template>
  <textarea
    v-bind="textareaAttrs"
    :aria-label="ariaLabel"
    :aria-labelledby="ariaLabelledby"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :rows="rows"
    :aria-invalid="invalid || undefined"
    :class="
      cn(
        'rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm',
        'transition-[color,background-color,border-color,box-shadow] duration-fast ease-out',
        // Rim-lit at rest, the weave blooms on focus (Signature law).
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        !invalid && 'focus-visible:shadow-halo',
        'placeholder:text-muted-foreground',
        'disabled:cursor-not-allowed disabled:opacity-50',
        invalid && 'border-destructive focus-visible:outline-destructive',
        resize === 'none' ? 'resize-none' : 'resize-y',
        attrs.class as string,
      )
    "
    @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
  />
</template>
