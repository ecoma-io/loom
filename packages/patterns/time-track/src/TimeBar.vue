<script setup lang="ts">
import { computed, inject, onMounted, useAttrs } from "vue";
import { cn } from "@ecoma-io/loom-core";
import { clamp, leftWithin, widthWithin } from "./geometry";
import { timeTrackContextKey } from "./TimeTrack.vue";

const props = withDefaults(
  defineProps<{
    /** Bar start, in epoch milliseconds (the track's clock). */
    start: number;
    /** Bar end, in epoch milliseconds. */
    end: number;
    /** Accessible name for the bar. Defaults to a duration label. */
    ariaLabel?: string;
  }>(),
  {},
);

defineOptions({ inheritAttrs: false });

const attrs = useAttrs();

const track = inject(timeTrackContextKey, null);

onMounted(() => {
  if (track === null) {
    console.warn(
      "TimeBar renders nothing outside a TimeTrack — bars position themselves on the track's window.",
    );
  }
});

// The window geometry lives in geometry.ts — TimeBar must not re-implement
// it, or the two drift (the NaN% bug: an unguarded span of zero). left is
// clamped into the window so a straddling bar reaches the track's edge; the
// width measures only the visible portion. Together they make the bar's CSS
// state the truth, not a promise the parent's overflow-hidden happens to keep.
const left = computed(() => {
  if (!track) return 0;
  return clamp(leftWithin(track.value.viewStart, track.value.viewEnd, props.start), 0, 100);
});

const width = computed(() => {
  if (!track) return 0;
  return widthWithin(track.value.viewStart, track.value.viewEnd, props.start, props.end);
});
</script>

<template>
  <div
    v-if="track"
    role="img"
    :aria-label="ariaLabel ?? `Duration ${Math.max(end - start, 0)} milliseconds`"
    :class="cn('absolute top-0 h-6 overflow-hidden rounded bg-primary/80', attrs.class as string)"
    :style="{ left: `${left}%`, width: `${width}%` }"
    data-loom-time-bar
  >
    <slot />
  </div>
</template>
