<script lang="ts">
/** Control height, and text size for the initials fallback. */
export type AvatarSize = "sm" | "md" | "lg";
</script>

<script setup lang="ts">
import { AvatarRoot, AvatarImage, AvatarFallback } from "reka-ui";
import { cn } from "../../lib/cn";

/**
 * Avatar — a user or agent's picture, with a graceful initials fallback for
 * no `src`, a broken URL, or a still-loading image. Built on Reka UI's
 * Avatar: the image only paints once it has actually finished loading, so
 * the fallback stays visible the whole time until then — first paint is
 * either the real photo or the initials, never a broken-image icon.
 */
withDefaults(
  defineProps<{
    /** Image URL. Omit it to render the fallback outright. */
    src?: string;
    /** Accessible name for the photo — required on `AvatarImage` so a screen reader announces who it is, not just that an image loaded. */
    alt?: string;
    /** Initials to show while there is no image, or once one has failed — computed by the caller, never derived from `alt` here. */
    fallback?: string;
    /** Control height. */
    size?: AvatarSize;
  }>(),
  {
    alt: "",
    size: "md",
  },
);
</script>

<template>
  <AvatarRoot
    :class="
      cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground select-none',
        size === 'sm' && 'h-8 w-8 text-xs',
        size === 'md' && 'h-10 w-10 text-sm',
        size === 'lg' && 'h-12 w-12 text-base',
      )
    "
  >
    <!-- Reka paints AvatarImage only once the photo has loaded, so scale-in
         plays exactly on that swap-in — a gentle settle over the fallback. -->
    <AvatarImage
      v-if="src"
      :src="src"
      :alt="alt"
      class="h-full w-full animate-scale-in object-cover"
    />
    <AvatarFallback class="font-medium">{{ fallback }}</AvatarFallback>
  </AvatarRoot>
</template>
