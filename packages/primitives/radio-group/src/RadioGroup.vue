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
import { cn } from "@ecoma-io/loom-core";
import { optional } from "@ecoma-io/loom-core";
import { useSplitAttrs } from "@ecoma-io/loom-core";
import { useFieldControl } from "@ecoma-io/loom-labels";

/**
 * RadioGroup — a vertical list of mutually exclusive options, each with a
 * visible (and optionally described) label — for longer or explained
 * choices and settings lists. For a compact horizontal toggle among 2-5
 * short options that are all visible at once, reach for SegmentedControl
 * instead. Built on Reka UI's RadioGroup: roving tabindex (the group is one
 * Tab stop, not N) with arrow-key navigation between items.
 *
 * Inside a [Field](../Field/Field.vue) the row's description, `name`,
 * `required` and `invalid` reach the group through `useFieldControl()`, and
 * `name` below still wins wherever it is set — the row and this prop are one
 * concept, not two that can disagree.
 *
 * **A row's label does not name this group.** `<label for>` names a labelable
 * element and this renders a `div[role="radiogroup"]`, so the row's label
 * resolves to the element and names nobody. Name it with a
 * [Fieldset](../Fieldset/Fieldset.vue)'s real `<legend>`, or with an
 * `aria-label`/`aria-labelledby` of its own.
 *
 * There is no `readonly`, and a row's is ignored rather than approximated: each
 * option is a `<button role="radio">` with no native read-only state to put it
 * in, and a group whose options cannot be picked is a disabled group.
 */
const props = withDefaults(
  defineProps<{
    /** The selected option's `value`. */
    modelValue?: string;
    /** The rows to render, in order. */
    options: RadioOption[];
    /** Disables every row at once, distinct from a single option's own `disabled`. Unset defers to a wrapping Field. */
    disabled?: boolean | undefined;
    /** Set when this group posts inside a real `<form>` — becomes the submitted field name. Unset defers to a wrapping Field. */
    name?: string;
  }>(),
  {
    // Not `false`: absent has to stay tellable from `false` for a Field above
    // to disable the group and for `:disabled="false"` to overrule one that
    // does. Vue casts an absent Boolean prop with no declared default to
    // `false`, which would leave the context wired and inert.
    disabled: undefined,
  },
);

defineEmits<{ "update:modelValue": [value: string] }>();

defineOptions({ inheritAttrs: false });
const { attrs, rest: groupAttrs } = useSplitAttrs();

// One rendered node, so the split is only about `class` — a caller's class
// needs a Tailwind-aware merge rather than Vue's concatenating fallthrough.
//
// `id` and `aria-describedby` arrive as fallthrough attrs rather than props, so
// they are handed in as this caller's own values; `field.attrs` then spreads
// **after** `groupAttrs`, and that position is the contract (see TextField.vue).
// `name` leaves `optional()` below with it: resolved once here, it reaches
// RadioGroupRoot's own `name` prop, which is what mints the hidden input a
// `<form>` submits.
//
// `required` and `invalid` are omitted because this component has no prop for
// either — the row's answer stands unopposed. `readonly` is omitted for the
// reason the docblock gives.
//
// The resolved `required` then reaches the group through Reka's own prop rather
// than the `aria-required` in `field.attrs`: RadioGroupRoot writes that
// attribute itself, so leaving it to the bag is a race with a `false` — see
// Checkbox.vue, where the merge order makes the same race a certainty.
const field = useFieldControl(() => ({
  id: attrs.id as string | undefined,
  describedBy: attrs["aria-describedby"] as string | undefined,
  name: props.name,
  disabled: props.disabled,
}));
</script>

<template>
  <RadioGroupRoot
    v-bind="{ ...optional({ modelValue }), ...groupAttrs, ...field.attrs }"
    :disabled="field.disabled"
    :required="field.required"
    orientation="vertical"
    :class="cn('flex flex-col gap-3', attrs.class as string)"
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
          'flex min-h-6 items-start gap-2 text-sm text-foreground',
          // Disabled text stays readable (AA on the light ground) — only the
          // control glyph dims; quiet, not illegible.
          field.disabled || opt.disabled
            ? 'cursor-not-allowed text-muted-foreground'
            : 'cursor-pointer',
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
            // Selected = a decision (Loom law): the ring turns primary.
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
