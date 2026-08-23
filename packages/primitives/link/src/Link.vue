<script lang="ts">
import { cva } from "class-variance-authority";

/** The visual emphasis assigned to a link. */
export type LinkVariant = "default" | "muted" | "accent" | "subtle";

export const linkVariants = cva(
  "inline-flex items-center gap-1 transition-colors duration-fast ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:shadow-halo",
  {
    variants: {
      variant: {
        default: "text-primary-text underline underline-offset-4 hover:text-primary-text/80",
        // Underlined like its siblings. WCAG 1.4.1 asks for a non-colour
        // carrier and the underline is the one links have; `muted` used to be
        // the variant that dropped it while keeping a hover colour change,
        // which identified the link by hue alone.
        muted: "text-muted-foreground underline underline-offset-4 hover:text-foreground",
        accent: "text-accent-text underline underline-offset-4 hover:text-accent-text/80",
        subtle:
          "text-foreground/80 hover:text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground/50",
      } satisfies Record<LinkVariant, string>,
      underline: {
        true: "",
        false: "no-underline",
      },
    },
    defaultVariants: {
      variant: "default",
      underline: true,
    },
  },
);
</script>

<script setup lang="ts">
import { cn } from "@ecoma-io/loom-core";

withDefaults(
  defineProps<{
    /** Controls the link's visual emphasis. */
    variant?: LinkVariant;
    /** Draws an underline beneath the link label. */
    underline?: boolean;
    /** The destination the link navigates to. */
    href: string;
    /** Opens the destination in a new tab and marks it as an external link. */
    external?: boolean;
    /** Replaces the anchor with an unavailable, non-interactive span. */
    disabled?: boolean;
  }>(),
  {
    variant: "default",
    underline: true,
    external: false,
    disabled: false,
  },
);
</script>

<template>
  <span
    v-if="disabled"
    :class="
      cn(
        linkVariants({ variant, underline }),
        // Drained, not dimmed — the same rule Button and Chip follow. The dim
        // faded whatever hue the variant wore, taking the label's contrast
        // down with it; a link has no fill to drain, so it takes the neutral
        // well the transparent controls take, and `aria-disabled` carries the
        // state rather than colour alone.
        'cursor-default bg-muted text-muted-foreground pointer-events-none',
        $attrs.class,
      )
    "
    aria-disabled="true"
  >
    <slot />
  </span>
  <a
    v-else
    :href="href"
    :class="cn(linkVariants({ variant, underline }), $attrs.class)"
    :target="external ? '_blank' : undefined"
    :rel="external ? 'noopener noreferrer' : undefined"
  >
    <slot />
    <svg
      v-if="external"
      class="h-3.5 w-3.5 shrink-0"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M7 17 17 7" />
      <path d="M7 7h10v10" />
    </svg>
  </a>
</template>
