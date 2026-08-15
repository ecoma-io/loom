<script lang="ts">
/**
 * Frame — fixed-ratio container.
 *
 * A container that maintains a consistent aspect ratio regardless of its
 * width, using CSS `aspect-ratio`. Useful for media embeds, image thumbnails,
 * and any content that needs a fixed ratio (video players, avatar crops,
 * card illustrations).
 *
 * A Frame is a component, not `aspect-video`, because the `ratio` prop
 * names the intent ("16:9", "1:1") rather than requiring the caller to
 * compute the `aspect-ratio` value, and the component handles the
 * `overflow: hidden` that prevents content from distorting the frame.
 */
export type FrameRatio = "16:9" | "4:3" | "1:1" | "3:4";

const aspectRatioValue: Record<FrameRatio, string> = {
  "16:9": "16 / 9",
  "4:3": "4 / 3",
  "1:1": "1 / 1",
  "3:4": "3 / 4",
} as const;

export { aspectRatioValue };
</script>

<script setup lang="ts">
import { cn } from "@ecoma-io/loom-core";

withDefaults(
  defineProps<{
    /** The aspect ratio to maintain. Named ratios or any valid CSS `aspect-ratio` value (e.g. "21 / 9"). */
    ratio?: FrameRatio | string;
  }>(),
  { ratio: "16:9" },
);

/** Resolve a named ratio or pass through a raw CSS value. */
function resolveRatio(r: FrameRatio | string): string {
  return r in aspectRatioValue ? aspectRatioValue[r as FrameRatio] : r;
}
</script>

<template>
  <div :class="cn('relative overflow-hidden w-full')" :style="{ aspectRatio: resolveRatio(ratio) }">
    <slot />
  </div>
</template>
