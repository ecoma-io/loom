<script lang="ts">
/**
 * FormActions — the submit/cancel button row at the bottom of a form. A block
 * that owns the layout of form actions so every form in the product has the
 * same action alignment: primary action right, cancel left, separated from the
 * form content by a top border.
 *
 * The block exists because "submit right, cancel left" is a layout decision
 * repeated in every form, and getting the spacing and alignment wrong is easy.
 * It owns the geometry; the host owns the button text and behavior.
 *
 * The default slot carries the primary actions (submit, save) and the `cancel`
 * slot carries the secondary action. In "between" mode the two slots sit at
 * opposite ends; in "right" or "left" mode everything goes through the default
 * slot, shifted to one side.
 */
export type FormActionsAlign = "right" | "left" | "between";
</script>

<script setup lang="ts">
import { cn } from "../../lib/cn";

withDefaults(
  defineProps<{
    /**
     * How the action row distributes its content.
     * - "between": cancel slot left, primary actions right (default — the
     *   arrangement most forms need)
     * - "right": all actions pushed right (short forms, single CTA)
     * - "left": all actions pushed left (right-to-left locales, or a design
     *   that calls for it)
     */
    align?: FormActionsAlign;
  }>(),
  { align: "between" },
);

const justify: Record<FormActionsAlign, string> = {
  between: "justify-between",
  right: "justify-end",
  left: "justify-start",
};
</script>

<template>
  <!-- border-t separates the actions from the form content above without
       needing a wrapping section or extra spacing rules -->
  <div :class="cn('flex items-center gap-3 border-t border-border pt-6', justify[align])">
    <!-- @slot The secondary/cancel action — placed on the left in "between" mode. -->
    <slot name="cancel" />
    <!-- @slot The primary actions (submit, save) — placed on the right in "between" mode. -->
    <slot />
  </div>
</template>
