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
        // The tinted washes use the opaque `*-muted` tokens, not an alpha of
        // the base hue: `bg-*-/12` composites against the surface behind it, so
        // the same badge renders at 4.46:1 on `bg-card` and differently on
        // `bg-sunken` — under the AA floor and inconsistent. `*-muted` is mixed
        // to hold ≥4.5:1 against its own `*-text` in both themes (see
        // theme.css), which is what these variants were named for.
        primary: "border-transparent bg-primary-muted text-primary-text",
        success: "border-transparent bg-success-muted text-success-text",
        // `-text`, not the bare `warning`: the tinted washes are mixed to hold
        // their contrast against the `*-text` rung in both themes, and the
        // base hue is not — on the dark `--color-warning` dropped to a
        // mid-amber that washed out against its own muted fill.
        warning: "border-transparent bg-warning-muted text-warning-text",
        info: "border-transparent bg-info-muted text-info-text",
        destructive: "border-transparent bg-destructive-muted text-destructive-text",
        accent: "border-accent/40 bg-accent-muted text-accent-text",
      } satisfies Record<BadgeVariant, string>,
    },
    defaultVariants: { variant: "neutral" },
  },
);
</script>

<script setup lang="ts">
import { cn } from "@ecoma-io/loom-core";

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
