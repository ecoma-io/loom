<script lang="ts">
import { cva } from "class-variance-authority";

/**
 * Surface — the panel/card primitive. Elevation is expressed by hairline
 * borders and background lightness, not heavy shadows (Loom principle:
 * "hairline over shadow"): on the paper-light ground a white `card` already
 * reads as raised, so only `overlay` carries a real shadow.
 */
export type SurfaceElevation = "card" | "muted" | "overlay";

export type SurfacePad = "none" | "sm" | "md" | "lg";

export const surfaceVariants = cva("rounded-lg transition-colors duration-fast", {
  variants: {
    variant: {
      card: "bg-card text-card-foreground border border-border",
      muted: "bg-muted text-foreground border border-transparent",
      overlay: "bg-popover text-popover-foreground border border-border shadow-md",
    } satisfies Record<SurfaceElevation, string>,
    pad: {
      none: "p-0",
      sm: "p-3",
      md: "p-4",
      lg: "p-6",
    } satisfies Record<SurfacePad, string>,
    // The ONE hover/press language for clickable rows and cards (a list row,
    // a picker card): lift by fill, hairline asserts, cursor signals — so
    // views stop hand-rolling their own `hover:bg-subtle` treatments. The
    // Surface stays a div; the host owns the actual click/role/tabindex.
    interactive: {
      true: "cursor-pointer hover:bg-subtle/60 hover:border-border-strong active:bg-subtle",
    },
  },
  defaultVariants: { variant: "card", pad: "md" },
});
</script>

<script setup lang="ts">
import { cn } from "../../lib/cn";

withDefaults(
  defineProps<{
    /** How the panel reads on the paper-light ground: a raised card, a recessed panel, or a floating overlay. */
    variant?: SurfaceElevation;
    /** Built-in inner padding, so a caller need not remember the spacing token. */
    pad?: SurfacePad;
    /** Clickable-surface language: hover fill lift, strong hairline, cursor. The host owns the click handler. */
    interactive?: boolean;
  }>(),
  { variant: "card", pad: "md", interactive: false },
);
</script>

<template>
  <div :class="cn(surfaceVariants({ variant, pad, interactive }))"><slot /></div>
</template>
