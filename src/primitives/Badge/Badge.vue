<script lang="ts">
import { cva } from "class-variance-authority";

/**
 * Badge — small status / meta chip. The `ai` variant wears the agent weft
 * used to signal AI presence across the product.
 */
export type BadgeVariant =
  "neutral" | "outline" | "primary" | "success" | "warning" | "info" | "destructive" | "ai";

export const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors duration-fast",
  {
    variants: {
      variant: {
        neutral: "border-transparent bg-subtle text-subtle-foreground",
        outline: "border-border bg-transparent text-muted-foreground",
        primary: "border-transparent bg-primary/12 text-primary",
        success: "border-transparent bg-success/12 text-success",
        warning: "border-transparent bg-warning/12 text-warning",
        info: "border-transparent bg-info/12 text-info",
        destructive: "border-transparent bg-destructive/12 text-destructive",
        ai: "border-agent/40 bg-agent-muted text-agent",
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
    /** Which status or meta this chip carries. `ai` is reserved for signalling agent-produced or agent-running work. */
    variant?: BadgeVariant;
  }>(),
  { variant: "neutral" },
);
</script>

<template>
  <span :class="cn(badgeVariants({ variant }))"><slot /></span>
</template>
