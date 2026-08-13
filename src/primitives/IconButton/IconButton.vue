<script lang="ts">
import { cva } from "class-variance-authority";

export type IconButtonVariant = "default" | "secondary" | "ghost" | "destructive";

export type IconButtonSize = "sm" | "md" | "lg";

/**
 * An icon-only button is a square, so every size is height-equals-width and has
 * no horizontal padding. The four variants match Button's press language — hover
 * lifts by fill — but `default` here names what Button calls `primary`, because
 * an icon button is never the screen's primary action and the word would mislead.
 */
export const iconButtonVariants = cva(
  "inline-flex items-center justify-center rounded-md transition-colors duration-fast ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70",
        ghost: "hover:bg-subtle text-foreground",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80",
      } satisfies Record<IconButtonVariant, string>,
      size: {
        sm: "h-8 w-8",
        md: "h-9 w-9",
        lg: "h-10 w-10",
      } satisfies Record<IconButtonSize, string>,
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);
</script>

<script setup lang="ts">
import { cn } from "../../lib/cn";

withDefaults(
  defineProps<{
    /** Visual weight, matching Button's press language but without the `primary` name — an icon button is never the action a screen is asking for. */
    variant?: IconButtonVariant;
    /** Square hit area. Every size is 24px or above (WCAG 2.2 SC 2.5.8). */
    size?: IconButtonSize;
    /** The accessible name. An icon-only button without one is a WCAG failure, so this prop is required. */
    label: string;
    /** Unavailable — blocks pointer events and dims the icon. */
    disabled?: boolean;
  }>(),
  { variant: "default", size: "md", disabled: false },
);
</script>

<template>
  <button
    :class="cn(iconButtonVariants({ variant, size }), $attrs.class)"
    :aria-label="label"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>
