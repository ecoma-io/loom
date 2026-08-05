<script lang="ts">
/** One selectable row in a {@link RadioGroup}. */
export interface RadioOption {
  /** Matched against `modelValue`. */
  value: string;
  /** Visible label, rendered beside the control. */
  label: string;
  /** Secondary text, rendered small under the label. */
  description?: string;
  /** Disables this row alone, leaving its siblings pickable. */
  disabled?: boolean;
}
</script>

<script setup lang="ts">
import { RadioGroupIndicator, RadioGroupItem, RadioGroupRoot } from "reka-ui";
import { cn } from "../../lib/cn";
import { optional } from "../../lib/props";

/**
 * RadioGroup — a vertical list of mutually exclusive options, each with a
 * visible (and optionally described) label — for longer or explained
 * choices and settings lists. For a compact horizontal toggle among 2-5
 * short options that are all visible at once, reach for SegmentedControl
 * instead. Built on Reka UI's RadioGroup: roving tabindex (the group is one
 * Tab stop, not N) with arrow-key navigation between items.
 */
withDefaults(
  defineProps<{
    /** The selected option's `value`. */
    modelValue?: string;
    /** The rows to render, in order. */
    options: RadioOption[];
    /** Disables every row at once, distinct from a single option's own `disabled`. */
    disabled?: boolean;
    /** Set when this group posts inside a real `<form>` — becomes the submitted field name. */
    name?: string;
  }>(),
  { disabled: false },
);

defineEmits<{ "update:modelValue": [value: string] }>();
</script>

<template>
  <RadioGroupRoot
    v-bind="optional({ modelValue, name })"
    :disabled="disabled"
    orientation="vertical"
    class="flex flex-col gap-3"
    @update:model-value="$emit('update:modelValue', String($event))"
  >
    <!-- RadioGroupItem is a labelable <button role="radio">, so wrapping it in
         <label> names it exactly like a native control; the rule's
         nesting/id heuristic just doesn't recognize reka-ui's custom element
         as a "control". -->
    <!-- eslint-disable-next-line vuejs-accessibility/label-has-for -->
    <label
      v-for="opt in options"
      :key="opt.value"
      :class="
        cn(
          'flex items-start gap-2 text-sm text-foreground',
          // Disabled text stays readable (AA on the light ground) — only the
          // control glyph dims; quiet, not illegible.
          disabled || opt.disabled ? 'cursor-not-allowed text-muted-foreground' : 'cursor-pointer',
        )
      "
    >
      <RadioGroupItem
        :value="opt.value"
        :class="
          cn(
            'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-input bg-background',
            // Springy transform (press squish), steady color — the transform
            // rides --ease-spring while border stays instant --ease-out (style
            // below), same press language as Button/Switch/Checkbox.
            'active:scale-90',
            // Selected = a human decision (Loom law): the ring turns warp.
            'data-[state=checked]:border-primary',
            // Focus draws the weave tight: the brand ring blooms.
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:shadow-halo',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )
        "
        :disabled="opt.disabled ?? false"
        style="
          transition:
            transform var(--duration-fast) var(--ease-spring),
            border-color var(--duration-instant) var(--ease-out),
            box-shadow var(--duration-fast) var(--ease-out);
        "
      >
        <!-- The dot pops in with scale-in — a small causal "it's selected now". -->
        <RadioGroupIndicator class="flex animate-scale-in items-center justify-center">
          <span class="h-2 w-2 rounded-full bg-primary" />
        </RadioGroupIndicator>
      </RadioGroupItem>
      <span class="flex flex-col gap-0.5">
        <span>{{ opt.label }}</span>
        <span v-if="opt.description" class="text-xs text-muted-foreground">{{
          opt.description
        }}</span>
      </span>
    </label>
  </RadioGroupRoot>
</template>
