<script lang="ts">
import { cva } from "class-variance-authority";

/** One row of the list. `value` is what the model carries; `label` is what a reader sees. */
export interface SelectOption {
  /** The value bound to `v-model` when this row is chosen. Unique within the list. */
  value: string;
  /** The text shown on the row, and on the trigger once it is chosen. */
  label: string;
  /** Present but unchoosable — visible, skipped by the keyboard, unclickable. */
  disabled?: boolean;
}

/**
 * The trigger's height scale. It matches the text input scale exactly, so a
 * form row mixing a Select beside a text field never comes out uneven — which
 * is why reaching past `size` for an `h-*` class is always the wrong fix.
 */
export type SelectSize = "sm" | "md" | "lg";

export const selectVariants = cva(
  [
    "group inline-flex w-full items-center justify-between gap-2 rounded-md border border-input bg-background text-foreground",
    "transition-[color,background-color,box-shadow] duration-fast ease-out hover:bg-subtle",
    // Rim-lit at rest; the ring blooms on focus.
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    "disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-muted-foreground",
  ],
  {
    // `satisfies` keeps the two halves honest: the union above is the name a
    // consumer imports and the documentation prints, the map below is the
    // classes. Adding a member to one and not the other stops compiling.
    variants: {
      size: {
        sm: "h-8 px-2.5 text-xs",
        md: "h-9 px-3 text-sm",
        lg: "h-11 px-4 text-base",
      } satisfies Record<SelectSize, string>,
    },
    defaultVariants: { size: "md" },
  },
);
</script>

<script setup lang="ts">
import {
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectIcon,
  SelectPortal,
  SelectContent,
  SelectViewport,
  SelectItem,
  SelectItemText,
  SelectItemIndicator,
} from "reka-ui";
import { Check, ChevronDown } from "@lucide/vue";
import { cn } from "../../lib/cn";
import { listStaggerDelay } from "../../lib/motion";
import { useSplitAttrs } from "../../lib/attrs";

/**
 * Select — pick one value out of a closed list, through a compact trigger and
 * a popover listbox. It suits roughly three to fifteen rows where one value is
 * always chosen: a language, a resolution, a quality preset.
 *
 * Below that, two to five options a reader should see all of at once are
 * better shown than hidden. Above it, a list long enough to need searching
 * wants a combobox, which is a different control rather than a longer version
 * of this one.
 *
 * Built on Reka UI's Select, which supplies the listbox semantics: arrow-key
 * navigation, first-character typeahead, Escape and outside-click to close, and
 * the `role="combobox"` trigger wired to the listbox by `aria-expanded` and
 * `aria-controls`. The active row is tracked by moving real focus onto it, not
 * by `aria-activedescendant`.
 */
withDefaults(
  defineProps<{
    /** The chosen option's `value`. Leave it unset to show the placeholder. */
    modelValue?: string;
    /** The rows, in the order they are shown. */
    options: SelectOption[];
    /** Shown on the trigger while nothing is chosen. It is not an option. */
    placeholder?: string;
    /** Unavailable: dims the trigger and refuses to open. */
    disabled?: boolean;
    /** Error state: paints the destructive border and ring, and sets `aria-invalid`. */
    invalid?: boolean;
    /** Trigger height. It shares the text input scale so mixed form rows stay aligned. */
    size?: SelectSize;
  }>(),
  { disabled: false, invalid: false, size: "md" },
);

defineEmits<{
  /** The chosen option's `value`. Fires once per choice; the list closes with it. */
  "update:modelValue": [value: string];
}>();

// The root renders no DOM node at all, so fallthrough attributes would be
// dropped on the floor rather than landing anywhere. They go to the trigger,
// which is the interactive element they describe.
//
// `class` is pulled out of that spread and merged through `cn()` instead.
// Spreading it alongside the trigger's own `:class` only concatenates the two
// lists — Vue's merge is generic, not Tailwind-aware — so a caller's `w-28`
// silently loses to the trigger's own `w-full` depending on which utility
// Tailwind happened to emit last.
defineOptions({ inheritAttrs: false });
const { attrs, rest: triggerAttrs } = useSplitAttrs();
</script>

<template>
  <SelectRoot
    :model-value="modelValue ?? ''"
    :disabled="disabled"
    @update:model-value="$emit('update:modelValue', String($event))"
  >
    <SelectTrigger
      v-bind="triggerAttrs"
      :aria-invalid="invalid || undefined"
      :data-invalid="invalid || undefined"
      :class="
        cn(
          selectVariants({ size }),
          !invalid && 'focus-visible:shadow-halo',
          invalid && 'border-destructive focus-visible:outline-destructive',
          attrs.class as string,
        )
      "
    >
      <SelectValue :placeholder="placeholder ?? ''" />
      <SelectIcon class="shrink-0 text-muted-foreground">
        <ChevronDown
          class="h-4 w-4 transition-transform duration-fast ease-out group-data-[state=open]:rotate-180"
        />
      </SelectIcon>
    </SelectTrigger>

    <SelectPortal>
      <SelectContent
        position="popper"
        :side-offset="6"
        :class="
          cn(
            'z-50 min-w-[var(--reka-select-trigger-width)] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md',
            // Scoped to the open state, never unconditional. Reka keeps the
            // closed content mounted while it waits for an animationend that a
            // mount-only animation never fires again — an invisible overlay
            // eating clicks. Scoping it makes the closed element compute
            // `animation-name: none`, which is the immediate-unmount branch.
            'data-[state=open]:animate-fade-rise',
          )
        "
      >
        <SelectViewport class="p-1">
          <!-- The rows reveal one step after another, from the shared stagger
               vocabulary rather than a per-template delay of its own. -->
          <SelectItem
            v-for="(option, index) in options"
            :key="option.value"
            :value="option.value"
            :disabled="option.disabled ?? false"
            :style="{ animationDelay: listStaggerDelay(index) }"
            :class="
              cn(
                'relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-1.5 pr-8 text-sm text-foreground outline-none',
                'transition-colors duration-fast ease-out',
                'animate-fade-rise',
                'data-[highlighted]:bg-subtle',
                'data-[state=checked]:bg-primary-muted data-[state=checked]:text-primary',
                'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
              )
            "
          >
            <SelectItemText>{{ option.label }}</SelectItemText>
            <SelectItemIndicator class="absolute right-2 inline-flex items-center">
              <Check class="h-4 w-4" />
            </SelectItemIndicator>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>
