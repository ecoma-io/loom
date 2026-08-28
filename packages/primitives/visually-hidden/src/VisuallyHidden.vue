<script lang="ts">
/** Which element tag carries the visually-hidden content. */
export type VisuallyHiddenElement = "span" | "div";
</script>

<script setup lang="ts">
/**
 * VisuallyHidden — content assistive technology reads that the page never
 * paints. The clip technique: a 1×1 box pulled out of flow and clipped to
 * nothing, which keeps the content in the accessibility tree and reachable
 * by in-page find. Deliberately not `display: none`, which would remove it
 * from screen readers too, and never focusable in its own right — if the
 * content should take focus, the caller puts a focusable element in the
 * slot and this wrapper stays inert.
 */
withDefaults(
  defineProps<{
    /** `span` keeps the markup valid inside phrasing content — labels, buttons, paragraphs. `div` when the hidden content is a block of its own. */
    as?: VisuallyHiddenElement;
  }>(),
  { as: "span" },
);
</script>

<template>
  <component
    :is="as"
    class="absolute -m-px h-px w-px overflow-hidden whitespace-nowrap border-0 p-0 [clip:rect(0,0,0,0)] [clip-path:inset(50%)]"
  >
    <slot />
  </component>
</template>
