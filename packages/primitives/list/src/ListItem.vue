<script lang="ts">
import { cva } from "class-variance-authority";

/**
 * Interactive comes in exactly two shapes, the same honesty Card documents:
 * `href` makes the whole row one real anchor (nothing interactive inside),
 * `interactive` paints hover/press while the host owns role/handler. Plain
 * rows are just rows.
 */
export type ListItemShape = "static" | "link" | "interactive";

export const listItemVariants = cva(
  "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors duration-fast ease-out",
  {
    variants: {
      shape: {
        static: "",
        // The shared clickable-row language: lift by fill, never by shadow.
        link: "cursor-pointer outline-none hover:bg-subtle/60 focus-visible:bg-subtle/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:shadow-halo [transition:transform_var(--duration-fast)_var(--ease-spring),background-color_var(--duration-fast)_var(--ease-out)] active:scale-[0.995]",
        interactive:
          "cursor-pointer hover:bg-subtle/60 focus-visible:bg-subtle/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:shadow-halo active:bg-subtle",
      },
      dense: { true: "px-2 py-1.5", false: "" },
    },
  },
);
</script>

<script setup lang="ts">
import { computed } from "vue";
import { Check } from "@lucide/vue";
import { cn } from "@ecoma-io/loom-core";

const props = withDefaults(
  defineProps<{
    /** The row's heading; omit when the default slot carries custom composition. */
    title?: string;
    /** Supporting line beneath the title. */
    description?: string;
    /** Trailing metadata — a count, a timestamp. Reads in tabular digits. */
    meta?: string;
    /** Makes the whole row one link. Nothing interactive may sit inside. */
    href?: string;
    /**
     * Hover/press language for a clickable row whose behaviour belongs to
     * the host; attach the handler yourself.
     */
    interactive?: boolean;
    /** Marks this row as the current choice among its peers (`aria-current`). */
    selected?: boolean;
    /** Unavailable rather than hidden: drained, inert, still announced. */
    disabled?: boolean;
    /** Tighter rhythm inside dense chrome. */
    dense?: boolean;
  }>(),
  {
    interactive: false,
    selected: false,
    disabled: false,
    dense: false,
  },
);

defineEmits<{ activate: [] }>();

// One of three shapes decides the element; a disabled row is an inert button
// rather than a missing one, so it stays announced.
const shape = computed<"link" | "interactive" | "static">(() =>
  props.href ? "link" : props.interactive ? "interactive" : "static",
);
</script>

<template>
  <li>
    <component
      :is="href ? 'a' : interactive ? 'button' : 'div'"
      :href="disabled ? undefined : href"
      :type="interactive && !href ? 'button' : undefined"
      :disabled="interactive && !href ? disabled : undefined"
      :aria-disabled="disabled || undefined"
      :aria-current="selected || undefined"
      :class="
        cn(
          listItemVariants({ shape, dense }),
          selected && !disabled && 'bg-primary-muted/40 aria-current:bg-primary-muted/40',
          disabled && 'cursor-not-allowed bg-transparent',
        )
      "
      @click="interactive && !disabled && $emit('activate')"
    >
      <!-- @slot Before the title: an icon, an Avatar. -->
      <slot name="leading" />

      <span class="min-w-0 flex-1">
        <span v-if="title" class="block truncate text-sm font-medium">{{ title }}</span>
        <span v-if="description" class="mt-0.5 block text-small text-muted-foreground">{{
          description
        }}</span>
        <!-- @slot Custom body; replaces title/description entirely. -->
        <slot />
      </span>

      <!-- Selection is stated twice: aria-current for technology, a glyph
           for eyes — colour alone is not a state. -->
      <Check v-if="selected" class="h-4 w-4 shrink-0 text-primary-text" aria-hidden="true" />

      <!-- @slot After everything: actions, a Badge, a RowActions cluster. -->
      <slot name="trailing">
        <span v-if="meta" class="shrink-0 text-small tabular text-muted-foreground">{{
          meta
        }}</span>
      </slot>
    </component>
  </li>
</template>
