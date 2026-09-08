<script lang="ts">
/**
 * FormSection — a labeled group of form fields with an optional
 * description, the arrangement every form page reaches for repeatedly: a
 * Fieldset (for the accessible `<fieldset>/<legend>` semantics, disabled/
 * readonly propagation, and hint/error line) with vertical Stack spacing
 * between the fields.
 *
 * The block exists because that composition is written at every form page
 * and the spacing between sections is a layout decision it can own once.
 * It is a thin convenience over Fieldset, not a replacement: when a group
 * needs a shape FormSection does not offer, Fieldset is still the right
 * primitive.
 *
 * `description` is NOT Fieldset's `hint`. The description sits between the
 * legend and the fields — it orients the person filling the form ("Where
 * should we ship your order?"). The hint sits below the fields and
 * supplements the controls themselves ("Street address, P.O. box, or
 * military address"). They serve different readers at different points in
 * the form and both can be present at once.
 */
export type FormSectionGap = "sm" | "md" | "lg";

const gapClass: Record<FormSectionGap, string> = {
  sm: "gap-2 sm:gap-3",
  md: "gap-3 sm:gap-4",
  lg: "gap-4 sm:gap-6",
} as const;

export { gapClass };
</script>

<script setup lang="ts">
import Fieldset from "@ecoma-io/loom-fieldset";
import { cn, optional } from "@ecoma-io/loom-core";

withDefaults(
  defineProps<{
    /** The section title — rendered as a real `<legend>` by Fieldset. */
    legend?: string;
    /**
     * Supporting text shown below the legend, above the fields.
     * NOT the same as `hint`, which sits below the fields — this orients the
     * person filling the form, while `hint` supplements the controls.
     */
    description?: string;
    /** Forwarded to Fieldset: supporting text shown below the group. Hidden while `error` is set. */
    hint?: string;
    /** Forwarded to Fieldset: the group's error message. Replaces `hint`. */
    error?: string;
    /** Forwarded to Fieldset: marks the group mandatory and appends a destructive asterisk. */
    required?: boolean;
    /** Forwarded to Fieldset: disables every control inside, slotted ones included. */
    disabled?: boolean;
    /** Forwarded to Fieldset: renders every Loom control inside read-only. */
    readonly?: boolean | undefined;
    /** Forwarded to Fieldset: set on the `<fieldset>`, used to derive the hint/error id. */
    id?: string;
    /** Gap between fields — mirrors Stack's gap scale. */
    gap?: FormSectionGap;
  }>(),
  {
    required: false,
    disabled: false,
    // Explicitly `undefined`, not `false`: matches Fieldset's own default so
    // an absent prop does not overrule a Field or control that set it.
    readonly: undefined,
    gap: "md",
  },
);
</script>

<template>
  <Fieldset
    v-bind="optional({ legend, hint, error, id })"
    :required="required"
    :disabled="disabled"
    :readonly="readonly"
  >
    <p v-if="description" class="max-w-prose text-small text-muted-foreground">
      {{ description }}
    </p>
    <div :class="cn('flex flex-col', gapClass[gap])">
      <!-- @slot The form fields in the section. -->
      <slot />
    </div>
  </Fieldset>
</template>
