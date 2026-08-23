<script lang="ts">
import { cva } from "class-variance-authority";

export type IconButtonVariant = "default" | "secondary" | "ghost" | "destructive";

export type IconButtonSize = "sm" | "md" | "lg";

/**
 * An icon-only button is a square, so every size is height-equals-width and has
 * no horizontal padding. The four variants match Button's press language — hover
 * lifts by fill, active presses down, focus blooms the primary ring — but
 * `default` here names what Button calls `primary`, because an icon button is
 * never the screen's primary action and the word would mislead.
 */
export const iconButtonVariants = cva(
  [
    "relative inline-flex items-center justify-center rounded-md select-none",
    // Button's own transition list, verbatim: transform rides --ease-spring so
    // the press squish springs, while colour and shadow stay on --ease-out.
    // A bare `transition-colors` silently dropped any transform change.
    "[transition:transform_var(--duration-fast)_var(--ease-spring),background-color_var(--duration-fast)_var(--ease-out),color_var(--duration-fast)_var(--ease-out),box-shadow_var(--duration-fast)_var(--ease-out)]",
    "active:scale-press focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:shadow-halo",
    "disabled:pointer-events-none",
  ],
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
import { cn } from "@ecoma-io/loom-core";

withDefaults(
  defineProps<{
    /** Visual weight, matching Button's press language but without the `primary` name — an icon button is never the action a screen is asking for. */
    variant?: IconButtonVariant;
    /** Square hit area. Every size is 24px or above (WCAG 2.2 SC 2.5.8). */
    size?: IconButtonSize;
    /** The accessible name. An icon-only button without one is a WCAG failure, so this prop is required. */
    label: string;
    /** Unavailable rather than dimmed — drains to the neutral well and blocks pointer events. */
    disabled?: boolean;
    /** The native button type. Defaults to `button`, never an accidental submit. */
    type?: "button" | "submit" | "reset";
  }>(),
  { variant: "default", size: "md", disabled: false, type: "button" },
);
</script>

<template>
  <button
    :type="type"
    :class="
      cn(
        iconButtonVariants({ variant, size }),
        $attrs.class,
        // Drained, not dimmed — Button's rule, and for the same measured reason:
        // `opacity-50` faded the fill and the glyph together, multiplying away
        // whatever contrast either had. One neutral treatment covers all four
        // variants here exactly as it does on Button — a fill-bearing icon
        // button gives up its hue, `ghost` gains a fill — because an unavailable
        // control has no emphasis left to carry, and the native `disabled`
        // attribute above carries the state to assistive tech regardless.
        // No `border-border` companion: unlike Button's variants none of these
        // paints a border to slacken.
        disabled && 'bg-muted text-muted-foreground shadow-none',
      )
    "
    :aria-label="label"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>
