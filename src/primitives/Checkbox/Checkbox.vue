<script setup lang="ts">
import { CheckboxIndicator, CheckboxRoot } from "reka-ui";
import { Check, Minus } from "@lucide/vue";
import { cn } from "../../lib/cn";
import { optional } from "../../lib/props";

/**
 * Checkbox — a single boolean choice inside a form (as opposed to Switch,
 * which flips a setting immediately, no form/"Save" involved). Built on Reka
 * UI's Checkbox (role="checkbox" + aria-checked, Space toggles); also
 * supports the third "indeterminate" state for a parent checkbox over a
 * partially-selected group — shown as a dash instead of a check.
 *
 * An inline `label` wraps the control in a real `<label>` (a11y name comes
 * free); omit it and pass `ariaLabel`/`ariaLabelledby` instead when the
 * visible label lives elsewhere (e.g. a table header cell).
 */
const props = withDefaults(
  defineProps<{
    /** `true`/`false` for a plain toggle, `"indeterminate"` for a parent over a partially-selected group. Omit to let the box own its own state. */
    modelValue?: boolean | "indeterminate" | undefined;
    /** Blocks both click and keyboard input, and dims the box. */
    disabled?: boolean;
    /** Visible text, rendered inside the wrapping `<label>`. Omit and use `ariaLabel`/`ariaLabelledby` when the label lives elsewhere. */
    label?: string;
    /** Accessible name when no visible `label` is rendered by this component. */
    ariaLabel?: string;
    /** Accessible name sourced from another element's id, when no visible `label` is rendered by this component. */
    ariaLabelledby?: string;
  }>(),
  {
    // Not `false`. A concrete value here would mean "the host owns this", and
    // a host that passes nothing would get a box that emits its update event
    // and never moves — a control that looks broken rather than one that
    // reports an error. `undefined` is what leaves it self-managing, and the
    // explicit default is what survives Vue's absent-Boolean-casts-to-false
    // rule.
    modelValue: undefined,
    disabled: false,
  },
);

defineEmits<{ "update:modelValue": [value: boolean | "indeterminate"] }>();

const boxClass = cn(
  "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-input bg-background",
  // Transform (the press squish) rides --ease-spring for a restrained release,
  // while fill/border stay on the instant --ease-out — the "springy transform,
  // steady color" split (boxStyle below), same language as Button/Switch.
  "active:scale-90",
  // Checked = a human decision (Loom law): the box fills flat warp.
  "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
  "data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground",
  // Focus draws the weave tight: the brand ring blooms.
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:shadow-halo",
  "disabled:cursor-not-allowed",
);

const boxStyle =
  "transition: transform var(--duration-fast) var(--ease-spring), background-color var(--duration-instant) var(--ease-out), border-color var(--duration-instant) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out);";
</script>

<template>
  <!-- CheckboxRoot is a labelable <button role="checkbox">, so wrapping it in
       <label> names it exactly like a native control; the rule's nesting/id
       heuristic just doesn't recognize reka-ui's custom element as a
       "control". -->
  <!-- eslint-disable-next-line vuejs-accessibility/label-has-for -->
  <label
    v-if="label"
    :class="
      cn(
        'inline-flex items-center gap-2 text-sm text-foreground',
        // Disabled text stays readable (AA on the light ground) — only the box dims.
        props.disabled ? 'cursor-not-allowed text-muted-foreground' : 'cursor-pointer',
      )
    "
  >
    <CheckboxRoot
      v-bind="optional({ modelValue })"
      :disabled="disabled"
      :class="cn(boxClass, 'disabled:opacity-50')"
      :style="boxStyle"
      @update:model-value="$emit('update:modelValue', $event)"
    >
      <template #default="{ state }">
        <!-- The tick pops in with scale-in — a small causal "it's checked now".
             stroke-width 2.5 is the ≤12px iconography rule, not a local taste:
             the inherited 1.5 renders 0.75 device px at 12px and reads washed
             out inside the filled box. Both branches carry it identically. -->
        <CheckboxIndicator class="flex animate-scale-in items-center justify-center text-current">
          <Minus v-if="state === 'indeterminate'" class="h-3 w-3" :stroke-width="2.5" />
          <Check v-else class="h-3 w-3" :stroke-width="2.5" />
        </CheckboxIndicator>
      </template>
    </CheckboxRoot>
    {{ label }}
  </label>
  <!-- The control always dims itself when disabled; label text stays
       readable muted — same stance in both branches. -->
  <CheckboxRoot
    v-else
    v-bind="optional({ modelValue })"
    :disabled="disabled"
    :aria-label="ariaLabel"
    :aria-labelledby="ariaLabelledby"
    :class="cn(boxClass, 'disabled:opacity-50')"
    :style="boxStyle"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template #default="{ state }">
      <CheckboxIndicator class="flex animate-scale-in items-center justify-center text-current">
        <Minus v-if="state === 'indeterminate'" class="h-3 w-3" :stroke-width="2.5" />
        <Check v-else class="h-3 w-3" :stroke-width="2.5" />
      </CheckboxIndicator>
    </template>
  </CheckboxRoot>
</template>
