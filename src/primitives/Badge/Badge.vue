<script lang="ts">
import { cva } from "class-variance-authority";

/**
 * Badge — small status / meta chip. The `accent` variant wears the accent
 * colour used to signal a second semantic category distinct from primary.
 */
export type BadgeVariant =
  "neutral" | "outline" | "primary" | "success" | "warning" | "info" | "destructive" | "accent";

export const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors duration-fast",
  {
    variants: {
      variant: {
        neutral: "border-transparent bg-subtle text-subtle-foreground",
        outline: "border-border bg-transparent text-muted-foreground",
        primary: "border-transparent bg-primary/12 text-primary-text",
        success: "border-transparent bg-success/12 text-success-text",
        warning: "border-transparent bg-warning/12 text-warning",
        info: "border-transparent bg-info/12 text-info",
        destructive: "border-transparent bg-destructive/12 text-destructive-text",
        accent: "border-accent/40 bg-accent-muted text-accent",
      } satisfies Record<BadgeVariant, string>,
    },
    defaultVariants: { variant: "neutral" },
  },
);
</script>

<script setup lang="ts">
import { cn } from "../../lib/cn";

withDefaults(
  defineProps<{
    /** Which status or meta this chip carries. `accent` is for signalling a second semantic category distinct from primary. */
    variant?: BadgeVariant;
  }>(),
  { variant: "neutral" },
);
</script>

<template>
  <span :class="cn(badgeVariants({ variant }))"><slot /></span>
</template>
