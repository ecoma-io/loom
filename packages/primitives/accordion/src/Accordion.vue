<script lang="ts">
/**
 * One collapsible section of the accordion. The list is data rather than markup
 * because the primitive stays free of structure logic — toggling a section emits
 * its `value` and the host decides what that open state means.
 */
export interface AccordionItem {
  /** Unique key for the item. */
  value: string;
  /** The heading text shown on the trigger. */
  label: string;
  /** Inert: announced as disabled, and toggling it does nothing. */
  disabled?: boolean;
}

/**
 * Whether the accordion allows one open item or many. The members mirror Reka's
 * own `AccordionType`, and the template binding is what enforces that.
 */
export type AccordionType = "single" | "multiple";

/**
 * Vertical gap between items, tightening below the `sm` breakpoint where the
 * accordion is more likely inside a narrow panel.
 */
export type AccordionGap = "sm" | "md" | "lg";
</script>

<script setup lang="ts">
import {
  AccordionRoot,
  AccordionItem as RekaAccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "reka-ui";
import { ChevronDown } from "@lucide/vue";
import { cn } from "@ecoma-io/loom-core";
import { optional } from "@ecoma-io/loom-core";

/**
 * Accordion — vertically stacked, expandable sections: each trigger reveals
 * its panel and collapses the rest (single mode) or lets several panels stay
 * open at once (multiple mode). Built on Reka UI's Accordion, which supplies
 * the `accordion`/`accordion-item`/`button`/`region` semantics and the
 * arrow-key navigation between triggers.
 *
 * Items are data rather than markup. A scoped default slot receives each item
 * so the host can render arbitrary content inside a panel — the primitive
 * owns the open/close mechanics and the trigger chrome, not what is inside the
 * panel.
 *
 * `collapsible` only matters in single mode: it governs whether the one open
 * item can be closed again. A non-collapsible single accordion always has
 * exactly one panel open. In multiple mode the prop is ignored — every item
 * can close independently.
 */
withDefaults(
  defineProps<{
    /** The sections, in order. Each needs a unique `value`. */
    items: AccordionItem[];
    /** Whether one or many items can be open at once. */
    type?: AccordionType;
    /** In single mode, whether the open item can be closed. Ignored in multiple mode. */
    collapsible?: boolean;
    /** Drive the open state from the host with `v-model`; omit it and the accordion owns its own state. */
    modelValue?: string | string[] | undefined;
    /** Vertical gap between items. */
    gap?: AccordionGap;
  }>(),
  {
    type: "single",
    collapsible: true,
    modelValue: undefined,
    gap: "md",
  },
);

// `modelValue: undefined` is load-bearing, not a redundant default — it is
// what keeps the uncontrolled third state reachable past Vue's absent-Boolean
// casting. `optional()` in the template is the other half; its docblock
// carries the reasoning for both.

defineEmits<{ "update:modelValue": [value: string | string[]] }>();

const GAP_CLASSES: Record<AccordionGap, string> = {
  sm: "gap-1 sm:gap-2",
  md: "gap-2 sm:gap-3",
  lg: "gap-3 sm:gap-4",
};
</script>

<template>
  <AccordionRoot
    :type="type"
    :collapsible="collapsible"
    v-bind="optional({ modelValue })"
    :class="cn('flex flex-col', GAP_CLASSES[gap])"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <RekaAccordionItem
      v-for="item in items"
      :key="item.value"
      :value="item.value"
      :disabled="item.disabled ?? false"
      class="border-b border-border last:border-b-0"
    >
      <AccordionTrigger
        :class="
          cn(
            'flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-foreground transition-colors duration-fast ease-out hover:bg-subtle rounded-md',
            // A disabled trigger must still be reachable by arrow key, so the
            // pointer is silenced but the element stays in the tab order.
            'data-[disabled]:pointer-events-none data-[disabled]:text-muted-foreground',
          )
        "
      >
        {{ item.label }}
        <!-- The chevron rotates 180deg when the item opens, matching the
             `data-[state=open]` attribute Reka sets on the trigger. A
             transition rather than an animation, because the rotation has no
             entrance/exit split — it just flips. -->
        <ChevronDown
          class="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-fast ease-out data-[state=open]:rotate-180"
        />
      </AccordionTrigger>
      <!-- Scoped to the open/closed state, never unconditional. Reka's
           Presence keeps closed content mounted until an animationend arrives,
           and a mount-only animation never fires a second one — so an
           unconditional animation class strands invisible content over the
           page. Scoped, the closed element computes `animation-name: none` and
           Presence unmounts it at once.

           The rise/fall pair is the existing vocabulary — a height animation
           keyed to Reka's `--reka-accordion-content-height` would need its own
           keyframe and utility registration, which belongs in `global.css` and
           `theme.css` rather than in a single component. -->
      <AccordionContent
        class="overflow-hidden data-[state=closed]:animate-fade-fall data-[state=open]:animate-fade-rise"
      >
        <div class="px-4 pb-3 text-sm text-muted-foreground">
          <!-- @slot The content of each panel. Receives the item as a slot prop. -->
          <slot :item="item" :index="items.indexOf(item)" />
        </div>
      </AccordionContent>
    </RekaAccordionItem>
  </AccordionRoot>
</template>
