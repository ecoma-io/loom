<script lang="ts">
/** Which scrollbars the area shows. */
export type ScrollAreaOrientation = "vertical" | "horizontal" | "both";
</script>

<script setup lang="ts">
import {
  ScrollAreaCorner,
  ScrollAreaRoot,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaViewport,
} from "reka-ui";
import { cn } from "@ecoma-io/loom-core";

/**
 * ScrollArea — custom-styled scrollbars for overflow content, replacing the
 * browser's native scrollbar with a thin track that expands on hover. Built on
 * Reka UI's ScrollArea primitives, which handle viewport sizing, pointer and
 * keyboard scrolling, and the scrollbar–thumb relationship.
 */
withDefaults(
  defineProps<{
    /** Which scrollbars to show. */
    orientation?: ScrollAreaOrientation;
    /** Optional class forwarded to each scrollbar element. */
    scrollbarClass?: string;
  }>(),
  { orientation: "vertical" },
);
</script>

<template>
  <ScrollAreaRoot :class="cn('relative overflow-hidden', $attrs.class)">
    <ScrollAreaViewport class="h-full w-full">
      <slot />
    </ScrollAreaViewport>
    <ScrollAreaScrollbar
      v-if="orientation !== 'horizontal'"
      orientation="vertical"
      :class="
        cn(
          'flex touch-none select-none w-2.5 border-l border-l-transparent p-px transition-colors',
          'hover:w-3',
          scrollbarClass,
        )
      "
    >
      <ScrollAreaThumb class="relative flex-1 rounded-full bg-border" />
    </ScrollAreaScrollbar>
    <ScrollAreaScrollbar
      v-if="orientation !== 'vertical'"
      orientation="horizontal"
      :class="
        cn(
          'flex touch-none select-none h-2.5 border-t border-t-transparent p-px transition-colors',
          'hover:h-3',
          scrollbarClass,
        )
      "
    >
      <ScrollAreaThumb class="relative flex-1 rounded-full bg-border" />
    </ScrollAreaScrollbar>
    <ScrollAreaCorner v-if="orientation === 'both'" />
  </ScrollAreaRoot>
</template>
