<script lang="ts">
import { cva } from "class-variance-authority";

export type SkeletonVariant = "text" | "circle" | "rect";

// A faint light band sweeps a muted base (background-color muted + a moving
// transparent→light→transparent gradient image) — the shimmer language,
// kept neutral and low-contrast so a loading page reads as "coming", not busy.
// Under prefers-reduced-motion the sweep simply stops on a flat muted block.
//
// The band's colour goes through `--alpha()` rather than `hsl(var(…)/…)`.
// Loom's tokens are whole colours (`--color-foreground: hsl(213 29% 15%)`),
// not the bare channel triplets that idiom expects, so wrapping one in `hsl()`
// produces a value the browser cannot compute — and a single invalid stop
// takes the entire gradient with it, leaving a flat block that still animates
// its own absence. `--alpha()` is Tailwind's own function for this and takes
// the token as it is actually written.
export const skeletonVariants = cva(
  "bg-muted bg-[linear-gradient(90deg,transparent_0%,--alpha(var(--color-foreground)/6%)_50%,transparent_100%)] bg-[length:200%_100%] animate-shimmer",
  {
    variants: {
      variant: {
        text: "h-4 rounded",
        circle: "rounded-full",
        rect: "rounded-md",
      } satisfies Record<SkeletonVariant, string>,
    },
    defaultVariants: { variant: "text" },
  },
);
</script>

<script setup lang="ts">
import { cn } from "@ecoma-io/loom-core";

/**
 * Skeleton — content-loading placeholder for a KNOWN layout (a card, a list
 * row, an avatar) so the page's shape reads as "coming" instead of jumping
 * once real content lands. For an indeterminate wait with no layout shape
 * yet, use Spinner instead. Purely decorative (`aria-hidden`) — the loading
 * state itself is announced elsewhere (e.g. a Spinner or a live region), not
 * by the placeholder shapes. Width/height are the caller's concern via a
 * passthrough `class` (e.g. `class="h-10 w-10"`).
 */
withDefaults(
  defineProps<{
    /** Which shape stands in for the real content: a text line, a round avatar, or a rectangular block. */
    variant?: SkeletonVariant;
  }>(),
  { variant: "text" },
);
</script>

<template>
  <div aria-hidden="true" :class="cn(skeletonVariants({ variant }))" />
</template>
