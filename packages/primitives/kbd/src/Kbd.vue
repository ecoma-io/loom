<script lang="ts">
import { cva } from "class-variance-authority";

/**
 * Kbd — one key cap. A combination is several of these side by side, joined
 * by a visible separator the host renders (`+` or `-`), with the whole run
 * given an accessible name on its wrapper; Kbd deliberately does not parse
 * shortcut strings, because the line between "display" and "shortcut
 * manager" is exactly where this primitive should stop.
 */
export type KbdSize = "sm" | "md";

export const kbdVariants = cva(
  [
    "inline-flex select-none items-center justify-center rounded-sm",
    // The cap: a subtle well, a hairline, and a bottom-weighted edge so it
    // reads as something you could press. Tokens only — high-contrast and
    // dark both come from the same pair every surface uses.
    "border border-border border-b-border-strong bg-subtle text-foreground shadow-sm",
    "font-mono tabular whitespace-nowrap",
  ],
  {
    variants: {
      size: {
        // Display-only, so target-size rules do not bind — the floors exist
        // because inline caps sit inside sentences, and one that shifts the
        // baseline or reads as a speck is worse than a generous box.
        sm: "min-h-6 min-w-6 px-1.5 text-xs",
        md: "min-h-7 min-w-7 px-2 text-small",
      },
    },
    defaultVariants: { size: "md" },
  },
);
</script>

<script setup lang="ts">
import { cn } from "@ecoma-io/loom-core";

withDefaults(
  defineProps<{
    /** `sm` sits inside prose and table cells; `md` for settings pages. */
    size?: KbdSize;
  }>(),
  { size: "md" },
);
</script>

<template>
  <kbd :class="cn(kbdVariants({ size }))">
    <!-- @slot The key's face — a letter, a glyph like ⌘, an arrow character. -->
    <slot />
  </kbd>
</template>
